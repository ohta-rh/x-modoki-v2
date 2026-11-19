/** What to tell someone when a Server Action could not reach the server (#70). */
export const OFFLINE_MESSAGE = '通信できませんでした。もう一度お試しください';

/**
 * A Server Action's result, or `failure` when its request failed (offline, a dropped connection).
 * Callers check `ok` already; a rejected promise would escape them, and in a transition it would
 * replace the page with Next.js's error screen (#70).
 */
export async function settle<T>(promise: Promise<T>, failure: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return failure;
  }
}
