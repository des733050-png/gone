import { ENDPOINTS } from '../../config/env';
import { isNative, parseCookies, getStore } from './sessionStore';
import { normalizeWebLoopbackUrl } from './requestClient';

export function createCsrfManager() {
  let webCsrfToken = null;
  let csrfFetched = false;
  let csrfInitPromise = null;

  function resetCsrfState() {
    webCsrfToken = null;
    csrfFetched = false;
    csrfInitPromise = null;
  }

  function isCsrfError(err) {
    const message = String(err?.message || '').toLowerCase();
    return message.includes('csrf');
  }

  async function fetchCsrf() {
    if (csrfFetched) return;
    const fetchOpts = isNative()
      ? { method: 'GET', credentials: 'omit', headers: { 'Content-Type': 'application/json' } }
      : { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    const response = await fetch(normalizeWebLoopbackUrl(ENDPOINTS.authCsrf), fetchOpts);
    if (!response.ok) throw new Error(`[Gonep API] CSRF init failed. HTTP ${response.status}.`);

    if (isNative()) {
      const raw = response.headers.get('set-cookie') || response.headers.get('Set-Cookie') || null;
      if (raw) parseCookies(raw);
    }

    const payload = await response.json().catch(() => ({}));
    const token = payload?.csrfToken || null;
    if (!token) throw new Error('[Gonep API] CSRF init failed. Missing CSRF token.');

    if (isNative()) getStore().csrfToken = token;
    else webCsrfToken = token;
    csrfFetched = true;
  }

  async function ensureCsrf() {
    if (csrfFetched) return;
    if (!csrfInitPromise) {
      csrfInitPromise = fetchCsrf()
        .catch((error) => {
          csrfFetched = false;
          throw error;
        })
        .finally(() => {
          csrfInitPromise = null;
        });
    }
    await csrfInitPromise;
  }

  function getWebCsrfToken() {
    return webCsrfToken;
  }

  function setWebCsrfToken(token) {
    webCsrfToken = token || null;
    csrfFetched = Boolean(token);
  }

  return {
    ensureCsrf,
    isCsrfError,
    resetCsrfState,
    getWebCsrfToken,
    setWebCsrfToken,
  };
}
