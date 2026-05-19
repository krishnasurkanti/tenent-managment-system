import { test as setup } from "@playwright/test";

// Runs once before any test suite (as a Playwright project dependency).
// Calls the test-only /api/test/reset endpoint to reset in-memory demo data.
// This handles the reuseExistingServer=true case where globalSetup file
// writes alone don't affect the running server's in-memory state.
setup("reset demo data", async ({ request }) => {
  const res = await request.post("/api/test/reset");
  if (!res.ok()) {
    console.warn(`[data-reset] /api/test/reset returned ${res.status()} — server may not be in test mode`);
  }
});
