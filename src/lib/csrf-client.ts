const CSRF_HEADER = "x-csrf-token";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Token stored in JS memory — never touches document.cookie.
// The HttpOnly csrf_token cookie is the server-side comparison target.
let cachedToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch("/api/csrf");
    if (res.ok) {
      const data = (await res.json()) as { token?: string };
      cachedToken = data.token ?? "";
    }
  } catch {
    cachedToken = "";
  }
  return cachedToken ?? "";
}

export function clearCsrfCache() {
  cachedToken = null;
}

/**
 * Drop-in replacement for `fetch` that automatically injects
 * X-CSRF-Token on all state-changing requests.
 */
export async function csrfFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();

  if (MUTATION_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    const headers = new Headers(init.headers);
    if (token) headers.set(CSRF_HEADER, token);
    return fetch(url, { ...init, headers });
  }

  return fetch(url, init);
}
