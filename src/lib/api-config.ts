function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || "";
}

export function getApiBaseUrl() {
  const configuredUrl =
    normalizeUrl(process.env.BACKEND_URL) ||
    normalizeUrl(process.env.NEXT_PUBLIC_API_URL) ||
    normalizeUrl(process.env.VITE_API_URL) ||
    normalizeUrl(process.env.REACT_APP_API_URL);

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BACKEND_URL env var is required in production");
    }
    return "http://localhost:4000";
  }

  return configuredUrl;
}

