const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const ownerMgmtRoutes = require("./routes/ownerMgmtRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = same-origin or non-browser (curl, server-to-server) — always allow
      if (!origin) return callback(null, true);
      // If env var is missing, default deny to fail closed
      if (allowedOrigins.length === 0) return callback(new Error("CORS not configured."));
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin denied."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/admin/owners", ownerMgmtRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
