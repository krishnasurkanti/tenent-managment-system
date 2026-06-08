const path = require("path");
const dotenv = require("dotenv");
// Monorepo layout: server.js lives at backend/src/server.js, env files at repo root.
// Try .env.local first (Next.js convention), then .env, then CWD default.
const root = path.resolve(__dirname, "../..");
// Load order: backend/.env → root .env.local → root .env → CWD .env
// First match wins (dotenv skips already-set vars when override:false).
dotenv.config({ path: path.join(root, "backend", ".env") });
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });
dotenv.config(); // fallback: .env in CWD

// Sentry is optional — only loads if the package is resolvable and DSN is set
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
  } catch {
    console.warn("@sentry/node not available — Sentry disabled.");
  }
}

const app = require("./app");
const { connectDatabase } = require("./config/db");
const { validateEnv, PORT } = require("./config/env");
const { initializeDatabase } = require("./services/schemaService");
const { startBillingJobs } = require("./jobs/billingJobs");

async function startServer() {
  validateEnv();
  await connectDatabase();
  await initializeDatabase();
  startBillingJobs();

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
