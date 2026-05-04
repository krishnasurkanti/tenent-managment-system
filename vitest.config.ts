import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
    globals: true,
    env: {
      TZ: "UTC",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
