const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const Redis = require("ioredis");
const { REDIS_URL } = require("../config/env");

let sharedStore;

function buildStore() {
  if (!REDIS_URL) return undefined;
  if (sharedStore) return sharedStore;

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.connect().catch(() => {
    // Fallback to memory store if Redis is unavailable.
  });

  sharedStore = new RedisStore({
    sendCommand: (...args) => client.call(...args),
    prefix: "rl:",
  });

  return sharedStore;
}

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildStore(),
    message: { message },
  });
}

const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: "Too many authentication requests. Try again later.",
});

const apiRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: "Too many requests. Slow down and retry.",
});

module.exports = {
  authRateLimit,
  apiRateLimit,
};
