export const DEFAULT_QUERY_TIMEOUT = 10_000;

export function withTimeout<T>(
  label: string,
  promise: Promise<T>,
  ms: number = DEFAULT_QUERY_TIMEOUT,
  fallback?: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        console.warn(`[safeQuery] ${label} TIMEOUT after ${ms}ms`);
        if (fallback !== undefined) resolve(fallback);
        else reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms),
    ),
  ]);
}

export type SafeQueryResult<T> =
  | { status: "success"; data: T | null }
  | { status: "timeout"; data: null }
  | { status: "error"; data: null; error: unknown };

export async function safeQuery<T>(
  label: string,
  promise: Promise<{ data: T | null; error: unknown }>,
  ms: number = DEFAULT_QUERY_TIMEOUT,
): Promise<SafeQueryResult<T>> {
  try {
    const result = await Promise.race([
      promise,
      new Promise<{ __timeout: true }>((resolve) =>
        setTimeout(() => resolve({ __timeout: true }), ms),
      ),
    ]);

    if ("__timeout" in result) {
      console.warn(`[safeQuery] ${label} TIMEOUT after ${ms}ms`);
      return { status: "timeout", data: null };
    }

    if (result.error) {
      console.error(`[safeQuery] ${label} error:`, result.error);
      return { status: "error", data: null, error: result.error };
    }

    return { status: "success", data: (result.data ?? null) as T | null };
  } catch (error) {
    console.error(`[safeQuery] ${label} threw:`, error);
    return { status: "error", data: null, error };
  }
}
