// src/api/transport/requestClient.js
import { API_CONFIG } from '../../config/env';
import { buildCookieHeader, getStore, isNative, parseCookies } from './sessionStore';

/**
 * Normalizes a URL for the current runtime environment.
 *
 * In production, absolute URLs with the correct backend origin pass straight
 * through unchanged — no rewriting needed.
 *
 * In development only, we swap localhost ↔ 127.0.0.1 so browser cookie
 * domains match the address the dev server is actually listening on.
 *
 * On native (Expo Go / bare RN) the URL is never touched.
 */
export function normalizeWebLoopbackUrl(url) {
  if (isNative()) return url;

  try {
    const parsed = new URL(url);

    // Production / staging: the URL's origin already matches the configured
    // backend — pass it through as-is.
    const backendOrigin = API_CONFIG.BASE_URL
      ? new URL(API_CONFIG.BASE_URL).origin
      : null;

    if (backendOrigin && parsed.origin === backendOrigin) {
      return parsed.toString();
    }

    // Development only: swap loopback aliases so session cookies work.
    const runtimeHost = globalThis?.location?.hostname || '';
    if (runtimeHost === 'localhost' && parsed.hostname === '127.0.0.1') {
      parsed.hostname = 'localhost';
      return parsed.toString();
    }
    if (runtimeHost === '127.0.0.1' && parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

async function extractErrorMessage(response) {
  try {
    const body = await response.clone().json();
    if (body?.error && typeof body.error === 'string') return body.error;
    if (body?.detail) return body.detail;
    const firstKey = Object.keys(body || {})[0];
    if (firstKey) {
      const value = body[firstKey];
      return Array.isArray(value) ? value[0] : String(value);
    }
  } catch {
    // ignore
  }
  return `Request failed (HTTP ${response.status}).`;
}

export function createRequestClient(csrfManager, { tokenMode = false } = {}) {
  async function apiFetch(url, options = {}, context = {}) {
    // Normalize the URL — absolute URLs (from ENDPOINTS) are passed through
    // after the loopback check; relative paths are resolved against BASE_URL.
    const resolvedUrl = normalizeWebLoopbackUrl(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    const method = String(options.method || 'GET').toUpperCase();
    const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const allowCsrfRetry = Boolean(context.allowCsrfRetry);
    const csrfRetried = Boolean(context.csrfRetried);

    try {
      if (needsCsrf) await csrfManager.ensureCsrf();
      const isFormDataBody =
        typeof FormData !== 'undefined' && options?.body instanceof FormData;
      const requestHeaders = {
        ...(options.headers || {}),
      };
      if (!isFormDataBody && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
      const store = getStore();
      let credentials = 'include';
      if (isNative()) {
        credentials = 'omit';
        const cookieHeader = buildCookieHeader();
        if (cookieHeader) requestHeaders.Cookie = cookieHeader;
        if (tokenMode && store.authToken) requestHeaders.Authorization = `Token ${store.authToken}`;
        if (needsCsrf && store.csrfToken) requestHeaders['X-CSRFToken'] = store.csrfToken;
      } else if (needsCsrf && csrfManager.getWebCsrfToken()) {
        requestHeaders['X-CSRFToken'] = csrfManager.getWebCsrfToken();
      }

      const response = await fetch(resolvedUrl, {
        ...options,
        method,
        signal: controller.signal,
        credentials,
        headers: requestHeaders,
      });

      if (isNative()) {
        const raw = response.headers.get('set-cookie') || response.headers.get('Set-Cookie') || null;
        if (raw) parseCookies(raw);
      }

      if (!response.ok) throw new Error(await extractErrorMessage(response));
      if (response.status === 204) return null;
      return response.json();
    } catch (err) {
      if (needsCsrf && allowCsrfRetry && !csrfRetried && csrfManager.isCsrfError(err)) {
        csrfManager.resetCsrfState();
        await csrfManager.ensureCsrf();
        return apiFetch(url, options, { ...context, csrfRetried: true });
      }
      if (err?.name === 'AbortError') {
        throw new Error(`[Gonep API] Request timed out after ${API_CONFIG.TIMEOUT_MS}ms.`);
      }
      throw new Error(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  return { apiFetch };
}
