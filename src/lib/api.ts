export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Appel JSON vers /api avec cookie de session et en-tête anti-CSRF. */
export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      signal: options.signal,
      headers: {
        accept: "application/json",
        "x-requested-with": "fetch",
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Connexion impossible. Vérifiez votre connexion internet.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* réponse vide */
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; details?: Record<string, string> };
    throw new ApiError(res.status, d.error ?? "Une erreur est survenue.", d.details ?? {});
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : "Une erreur inattendue est survenue.";
}
