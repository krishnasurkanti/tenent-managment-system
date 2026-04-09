const DEFAULT_API_URL = "https://hostel-backend-qa1e.onrender.com";

function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || "";
}

export function getApiBaseUrl() {
  const configuredUrl =
    normalizeUrl(process.env.NEXT_PUBLIC_API_URL) ||
    normalizeUrl(process.env.BACKEND_URL) ||
    normalizeUrl(process.env.VITE_API_URL) ||
    normalizeUrl(process.env.REACT_APP_API_URL);

  return configuredUrl || DEFAULT_API_URL;
}

