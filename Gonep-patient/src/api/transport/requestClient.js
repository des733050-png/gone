import { API_CONFIG } from '../../config/env';
import { buildCookieHeader, getStore, isNative, parseCookies } from './sessionStore';

export function normalizeWebLoopbackUrl(url) {
  if (isNative()) return url;
  try {
    const parsed = new URL(url);
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
    if (body?.detail) return body.detail;
    const firstKey = Object.keys(body || {})[0];
    if (firstKey) {
      const val = body[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
  } catch {
    // ignore
  }
  return `Request failed (HTTP ${response.status}).`;
}

export function createRequestClient(csrfManager) {
  async function apiFetch(url, options = {}, context = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    const method = String(options.method || 'GET').toUpperCase();
    const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const allowCsrfRetry = Boolean(context.allowCsrfRetry);
    const csrfRetried = Boolean(context.csrfRetried);

    try {
      if (needsCsrf) await csrfManager.ensureCsrf();

      const requestHeaders = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      const store = getStore();
      let credentials = 'include';
      if (isNative()) {
        credentials = 'omit';
        const cookieHeader = buildCookieHeader();
        if (cookieHeader) requestHeaders.Cookie = cookieHeader;
        if (store.authToken) requestHeaders.Authorization = `Token ${store.authToken}`;
        if (needsCsrf && store.csrfToken) requestHeaders['X-CSRFToken'] = store.csrfToken;
      } else if (needsCsrf && csrfManager.getWebCsrfToken()) {
        requestHeaders['X-CSRFToken'] = csrfManager.getWebCsrfToken();
      }

      const response = await fetch(normalizeWebLoopbackUrl(url), {
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
