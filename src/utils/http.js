/**
 * Small fetch wrapper with a timeout. All network access in the app goes
 * through here so failures are consistent and never hang the UI.
 */

export class HttpError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, url?: string, cause?: unknown, timeout?: boolean }} [info]
   */
  constructor(message, info = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = info.status ?? 0;
    this.url = info.url ?? '';
    this.timeout = Boolean(info.timeout);
    this.cause = info.cause;
  }
}

/**
 * Fetch a URL and parse JSON, aborting after `timeoutMs`.
 *
 * @template T
 * @param {string} url
 * @param {{ timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<T>}
 */
export async function fetchJson(url, options = {}) {
  const { timeoutMs = 8000, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new HttpError(`Request failed with status ${res.status}`, { status: res.status, url });
    }
    return await res.json();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const isAbort = err && typeof err === 'object' && err.name === 'AbortError';
    throw new HttpError(isAbort ? 'Request timed out' : 'Network request failed', {
      url,
      cause: err,
      timeout: isAbort,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** True when the browser reports no network connection. */
export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
