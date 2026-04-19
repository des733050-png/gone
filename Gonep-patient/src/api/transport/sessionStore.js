import { Platform } from 'react-native';

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
    const name = pair.slice(0, eqIdx).trim().toLowerCase();
    const value = pair.slice(eqIdx + 1).trim();
    if (name === 'sessionid') store.sessionId = value;
    if (name === 'csrftoken') store.csrfToken = value;
  }
}

export function buildCookieHeader() {
  const parts = [];
  if (store.sessionId) parts.push(`sessionid=${store.sessionId}`);
  if (store.csrfToken) parts.push(`csrftoken=${store.csrfToken}`);
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
