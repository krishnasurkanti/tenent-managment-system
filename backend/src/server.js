const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const { connectDatabase } = require("./config/db");
const { validateEnv, PORT } = require("./config/env");
const { initializeDatabase } = require("./services/schemaService");

async function startServer() {
  validateEnv();
  await connectDatabase();
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
