/**
 * Generate a reasonably unique id for client-side records.
 * Uses crypto.randomUUID when available, with a timestamp-based fallback.
 *
 * @param {string} [prefix='fly']
 * @returns {string}
 */
export function createId(prefix = 'fly') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
