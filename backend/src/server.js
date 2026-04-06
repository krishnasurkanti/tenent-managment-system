const dotenv = require("dotenv");
const app = require("./app");
const connectDatabase = require("./config/db");

dotenv.config();

const port = Number(process.env.API_PORT || 4000);

async function startServer() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
