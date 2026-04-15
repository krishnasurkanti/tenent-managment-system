type AuthPayload = {
  username: string;
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  password: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function loginOwner(payload: AuthPayload) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function registerOwner(payload: RegisterPayload) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function loginAdmin(payload: AuthPayload) {
  const response = await fetch("/api/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function loginDemoOwner() {
  const response = await fetch("/api/auth/demo-login", {
    method: "POST",
  });

  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function logoutOwner() {
  return fetch("/api/auth/logout", { method: "POST" });
}

export async function logoutAdmin() {
  return fetch("/api/auth/admin/logout", { method: "POST" });
}
