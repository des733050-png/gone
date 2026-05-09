import { API_CONFIG } from '../../config/env';
import { buildCookieHeader, clearStore, getStore, isNative, parseCookies } from './sessionStore';

// ── Session-invalid signal ────────────────────────────────────────────────────
// When the server returns 401/403 for an authenticated request, the session
// cookie / CSRF / token is no longer valid. We clear local auth state and
// dispatch a custom event so the app shell can redirect to the login screen.
function signalSessionInvalid(reason) {
  try {
    clearStore();
  } catch (_) {}
  if (typeof globalThis !== 'undefined' && typeof globalThis.dispatchEvent === 'function') {
    try {
      const evt = (typeof CustomEvent !== 'undefined')
        ? new CustomEvent('gonep:session-invalid', { detail: { reason } })
        : { type: 'gonep:session-invalid', detail: { reason } };
      globalThis.dispatchEvent(evt);
    } catch (_) {}
  }
}

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

      // Always disable HTTP caching for API calls — list/detail GETs change
      // frequently and stale browser-cache responses cause "refresh shows
      // old data" bugs.
      if (method === 'GET' && !requestHeaders['Cache-Control']) {
        requestHeaders['Cache-Control'] = 'no-cache';
        requestHeaders['Pragma'] = 'no-cache';
      }

      const response = await fetch(normalizeWebLoopbackUrl(url), {
        ...options,
        method,
        signal: controller.signal,
        credentials,
        cache: options.cache || 'no-store',
        headers: requestHeaders,
      });

      if (isNative()) {
        const raw = response.headers.get('set-cookie') || response.headers.get('Set-Cookie') || null;
        if (raw) parseCookies(raw);
      }

      if (!response.ok) {
        // 401/403 indicates a session/cookie/CSRF mismatch — force-logout so
        // the user can re-authenticate cleanly. Skip for the auth endpoints
        // themselves (login/csrf) — those legitimately return 401 on bad
        // credentials and shouldn't blow the session away.
        if ((response.status === 401 || response.status === 403)
            && !/\/auth\/(login|csrf|session|register|forgot-password)/.test(url)) {
          signalSessionInvalid(`HTTP ${response.status} on ${method} ${url}`);
        }
        throw new Error(await extractErrorMessage(response));
      }
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
