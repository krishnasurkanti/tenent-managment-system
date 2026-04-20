type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function createLimiter(max: number, windowMs: number) {
  return function check(key: string): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return false; // not limited
    }

    entry.count += 1;
    if (entry.count > max) return true; // limited
    return false;
  };
}

// 10 attempts per 15 minutes per IP for auth endpoints
export const authRateLimit = createLimiter(10, 15 * 60 * 1000);

// 60 attempts per minute per IP for general API endpoints
export const apiRateLimit = createLimiter(60, 60 * 1000);
