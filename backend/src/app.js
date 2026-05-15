const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
let Sentry = null;
try { Sentry = require("@sentry/node"); } catch { /* optional dependency */ }
const authRoutes = require("./routes/authRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const ownerMgmtRoutes = require("./routes/ownerMgmtRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const signupRoutes = require("./routes/signupRoutes");
const ownerBillingRoutes = require("./routes/ownerBillingRoutes");
const adminBillingRoutes = require("./routes/adminBillingRoutes");
const adminBackupRoutes = require("./routes/adminBackupRoutes");
const platformStatsRoutes = require("./routes/platformStatsRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { authRateLimit, apiRateLimit } = require("./middleware/rateLimitMiddleware");
const { query } = require("./config/db");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
const devLocalhostOrigins = process.env.NODE_ENV !== "production"
  ? ["http://localhost:3000", "http://127.0.0.1:3000"]
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = same-origin or non-browser (curl, server-to-server) — always allow
      if (!origin) return callback(null, true);
      // Dev fallback — allow localhost when CORS_ORIGIN not configured
      if (devLocalhostOrigins.includes(origin)) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(new Error("CORS not configured."));
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin denied."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api/auth/login", authRateLimit);
app.use("/api/auth/register", authRateLimit);
app.use("/api/signup", authRateLimit);
app.use("/api", apiRateLimit);

app.use("/api/auth", authRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/admin/owners", ownerMgmtRoutes);
app.use("/api/admin/invitations", invitationRoutes);
app.use("/api/signup", signupRoutes);
app.use("/api/owner-billing", ownerBillingRoutes);
app.use("/api/admin/billing", adminBillingRoutes);
app.use("/api/admin/backups", adminBackupRoutes);
app.use("/api/platform-stats", platformStatsRoutes);
app.use("/api/complaints", complaintRoutes);

app.use(notFound);
// Sentry error handler must come before our custom errorHandler
if (process.env.SENTRY_DSN && Sentry) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

module.exports = app;
