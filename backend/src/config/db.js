const { Pool } = require("pg");

let pool;

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production" || connectionString.includes("render.com")
        ? { rejectUnauthorized: false }
        : false,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 10000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
  });

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
  await query("SELECT 1");
}

module.exports = {
  getPool,
  query,
  getClient,
  connectDatabase,
};
