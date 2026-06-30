// Extract the real client IP from request headers.
//
// Trusted-header extraction is OFF BY DEFAULT. Set TRUST_PROXY_HEADERS=true
// only when the deployment guarantees:
//   1. direct origin access is blocked (e.g. Cloudflare firewall, Render private networking)
//   2. the proxy strips any client-supplied values for these headers before forwarding
//
// When TRUST_PROXY_HEADERS is not "true", returns "unknown" so all requests
// share one rate-limit bucket. This is stricter (global throttle) but never
// bypassable — attacker cannot choose their own rate-limit key.
//
// With TRUST_PROXY_HEADERS=true, trusts (in order):
//   cf-connecting-ip       — Cloudflare (strips client value, sets real IP)
//   x-real-ip              — nginx (proxy_set_header X-Real-IP $remote_addr)
//   x-vercel-forwarded-for — Vercel platform header
export function getTrustedClientIp(request: Request): string {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return "unknown";
  const h = (name: string) => (request as { headers: { get(n: string): string | null } }).headers.get(name);
  return (
    h("cf-connecting-ip") ??
    h("x-real-ip") ??
    h("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

type Entry = { count: number; resetAt: number };

function createLimiter(max: number, windowMs: number) {
  // Each limiter gets its own store — prevents key collisions between auth and API limits (P-05)
  const store = new Map<string, Entry>();
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
