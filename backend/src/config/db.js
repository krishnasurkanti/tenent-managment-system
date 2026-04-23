const { Pool } = require("pg");

let pool;

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  return connectionString;
}

function getSslMode(connectionString) {
  try {
    return new URL(connectionString).searchParams.get("sslmode");
  } catch {
    return null;
  }
}

function createPool(rejectUnauthorizedOverride) {
  const connectionString = getConnectionString();
  const sslMode = getSslMode(connectionString);
  const explicitSsl = process.env.DB_SSL?.toLowerCase();
  const sslDisabled = explicitSsl === "false" || sslMode === "disable";
  const sslEnabled =
    !sslDisabled &&
    (explicitSsl === "true" ||
      process.env.NODE_ENV === "production" ||
      connectionString.includes("render.com") ||
      sslMode === "require" ||
      sslMode === "verify-ca" ||
      sslMode === "verify-full");

  // Hosted Postgres providers often use self-signed cert chains for app connections.
  // Allow env override, and let startup retry once with a relaxed check when the first TLS
  // handshake fails for certificate validation.
  const rejectUnauthorized =
    rejectUnauthorizedOverride ?? process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

  return new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized } : false,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 10000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  });
}

function getPool() {
  if (pool) {
    return pool;
  }

  pool = createPool();

  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error", error);
  });

  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function getClient() {
  return getPool().connect();
}

async function connectDatabase() {
  try {
    await query("SELECT 1");
  } catch (error) {
    const isTlsCertError =
      error &&
      (error.code === "SELF_SIGNED_CERT_IN_CHAIN" ||
        error.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
        error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        /self-signed certificate|unable to verify the first certificate/i.test(error.message || ""));

    const canRetryWithRelaxedSsl =
      isTlsCertError &&
      process.env.DB_SSL !== "false" &&
      process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

    if (!canRetryWithRelaxedSsl) {
      throw error;
    }

    console.warn(
      "[db] TLS certificate validation failed; retrying PostgreSQL connection with DB_SSL_REJECT_UNAUTHORIZED=false.",
    );

    await pool?.end().catch(() => {});
    pool = createPool(false);
    pool.on("error", (poolError) => {
      console.error("Unexpected PostgreSQL pool error", poolError);
    });

    await pool.query("SELECT 1");
  }
}

module.exports = {
  getPool,
  query,
  getClient,
  connectDatabase,
};
