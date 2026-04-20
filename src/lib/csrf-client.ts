const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  for (const part of document.cookie.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey?.trim() === CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function ensureCsrfToken(): Promise<string> {
  let token = readCsrfCookie();
  if (!token) {
    // Cold start: hit the csrf endpoint so middleware sets the cookie
    await fetch("/api/csrf").catch(() => null);
    token = readCsrfCookie();
  }
  return token;
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
