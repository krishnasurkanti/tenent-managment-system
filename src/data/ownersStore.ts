// Owner data now lives in PostgreSQL — managed via backend API.
// This module is kept only for in-process login-attempt tracking (lockout).

type LockoutEntry = { attempts: number; lockedUntil: number };
const loginAttempts = new Map<string, LockoutEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkLockout(identifier: string): { locked: boolean; remainingMs: number } {
  const entry = loginAttempts.get(identifier.toLowerCase());
  if (!entry) return { locked: false, remainingMs: 0 };
  if (entry.lockedUntil > Date.now()) {
    return { locked: true, remainingMs: entry.lockedUntil - Date.now() };
  }
  return { locked: false, remainingMs: 0 };
}

export function recordFailedAttempt(identifier: string): void {
  const key = identifier.toLowerCase();
  const existing = loginAttempts.get(key) ?? { attempts: 0, lockedUntil: 0 };
  const attempts = existing.attempts + 1;
  loginAttempts.set(key, {
    attempts,
    lockedUntil: attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : existing.lockedUntil,
  });
}

export function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier.toLowerCase());
}
