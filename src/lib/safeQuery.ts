// Async helpers with hard timeouts to prevent infinite loading states.

export const DEFAULT_QUERY_TIMEOUT_MS = 8_000;

type QueryStatus = "success" | "timeout" | "error";

export interface SafeQueryResult<T> {
  status: QueryStatus;
  data: T | null;
  error: unknown | null;
}

/** Race a promise against a timeout. If the promise rejects, the rejection propagates. */
export function withTimeout<T>(
  label: string,
  promise: Promise<T>,
  ms: number = DEFAULT_QUERY_TIMEOUT_MS,
  fallback?: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        if (fallback !== undefined) {
          console.warn(`[safeQuery] ${label} timed out after ${ms}ms; using fallback`);
          resolve(fallback);
        } else {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }
      }, ms),
    ),
  ]);
}

/**
 * Wrap a Supabase query (or anything returning `{ data, error }`) with a timeout.
 * Never throws — always resolves with a tagged status.
 */
export async function safeQuery<T>(
  label: string,
  promise: PromiseLike<{ data: T | null; error: unknown }>,
  ms: number = DEFAULT_QUERY_TIMEOUT_MS,
): Promise<SafeQueryResult<T>> {
  try {
    const result = await Promise.race([
      Promise.resolve(promise),
      new Promise<{ __timeout: true }>((resolve) =>
        setTimeout(() => resolve({ __timeout: true }), ms),
      ),
    ]);

    if ("__timeout" in result) {
      console.warn(`[safeQuery] ${label} TIMEOUT after ${ms}ms`);
      return { status: "timeout", data: null, error: null };
    }

    if (result.error) {
      console.error(`[safeQuery] ${label} error:`, result.error);
      return { status: "error", data: null, error: result.error };
    }

    return { status: "success", data: (result.data ?? null) as T | null, error: null };
  } catch (error) {
    console.error(`[safeQuery] ${label} threw:`, error);
    return { status: "error", data: null, error };
  }
}
