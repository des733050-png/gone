// ─── utils/textValidation.js ─────────────────────────────────────────────────
// Helpers for free-form text fields (reason for visit, notes, etc.).

/** Count whitespace-separated tokens that contain at least one letter/digit. */
export function countWords(value) {
  if (!value) return 0;
  return String(value)
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w))
    .length;
}

/**
 * Validate minimum word count. Returns null when valid, otherwise a short
 * human-readable error message.
 */
export function validateMinWords(value, minWords = 5, fieldLabel = 'This field') {
  const n = countWords(value);
  if (n >= minWords) return null;
  return `${fieldLabel} needs at least ${minWords} word${minWords === 1 ? '' : 's'} (you have ${n}).`;
}

/** Trim, collapse internal whitespace, and clamp length. */
export function sanitizeFreeformText(value, maxLen = 500) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLen);
}
