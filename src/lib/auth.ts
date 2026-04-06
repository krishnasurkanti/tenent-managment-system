export const SESSION_COOKIE_NAME = "owner_session";
const SESSION_COOKIE_VALUE = "owner-authenticated";

const DEFAULT_USERNAME = "owneradmin";
const DEFAULT_PASSWORD = "Owner@123";

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME?.trim() || DEFAULT_USERNAME;
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || DEFAULT_PASSWORD;
}

export function isValidAdminLogin(username: string, password: string) {
  return username === getAdminUsername() && password === getAdminPassword();
}

export function getSessionCookieValue() {
  return SESSION_COOKIE_VALUE;
}
