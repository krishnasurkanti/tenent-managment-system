const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const hostelRoutes = require("./routes/hostelRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
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
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

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

app.use("/auth", authRoutes);
app.use("/hostels", hostelRoutes);
app.use("/tenants", tenantRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/tenants", tenantRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
