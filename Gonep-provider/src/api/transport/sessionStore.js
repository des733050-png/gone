import { Platform } from 'react-native';

// ─── Provider portal uses its OWN session-cookie name ────────────────────────
// The backend's PortalSessionMiddleware issues "provider_sessionid" for
// requests originating from port 8082.  Using a different name from the
// patient portal's "sessionid" prevents the two sessions from colliding
// when both portals are open on the same device / browser (cookies are
// domain-scoped by browsers, NOT port-scoped).
const SESSION_COOKIE = 'provider_sessionid';
const CSRF_COOKIE    = 'csrftoken';

const store = {
  sessionId: null,
  csrfToken: null,
  authToken: null,
};

export function isNative() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function parseCookies(raw) {
  if (!raw) return;
  const headers = Array.isArray(raw) ? raw : [raw];
  for (const header of headers) {
    const pair = header.split(';')[0].trim();
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const name  = pair.slice(0, eqIdx).trim().toLowerCase();
    const value = pair.slice(eqIdx + 1).trim();
    if (name === SESSION_COOKIE) store.sessionId = value;
    if (name === CSRF_COOKIE)    store.csrfToken  = value;
  }
}

export function buildCookieHeader() {
  const parts = [];
  if (store.sessionId) parts.push(`${SESSION_COOKIE}=${store.sessionId}`);
  if (store.csrfToken) parts.push(`${CSRF_COOKIE}=${store.csrfToken}`);
  return parts.join('; ');
}

export function clearStore() {
  store.sessionId = null;
  store.csrfToken = null;
  store.authToken = null;
}

export function getStore() {
  return store;
}
