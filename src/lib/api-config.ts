function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || "";
}

// Required env var: BACKEND_URL (server-side only — never expose to browser)
// Fallback NEXT_PUBLIC_API_URL for backwards compatibility only.
export function getApiBaseUrl() {
  const configuredUrl =
    normalizeUrl(process.env.BACKEND_URL) ||
    normalizeUrl(process.env.NEXT_PUBLIC_API_URL);

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BACKEND_URL env var is required in production.");
    }
    return "http://localhost:4000";
  }

  return configuredUrl;
}

