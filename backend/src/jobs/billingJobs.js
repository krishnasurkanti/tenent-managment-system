const { runInvoiceCycleJob, trackDailyTenantCounts } = require("../services/adminBillingService");

let started = false;

async function runAllJobs() {
  await trackDailyTenantCounts();
  await runInvoiceCycleJob();
}

function startBillingJobs() {
  if (started) return;
  started = true;

  // Run once on boot for catch-up in MVP environments.
  runAllJobs().catch((error) => {
    console.error("Billing bootstrap job failed", error);
  });

  // Daily execution (24h). Keep simple for MVP.
  setInterval(() => {
    runAllJobs().catch((error) => {
      console.error("Billing interval job failed", error);
    });
  }, 24 * 60 * 60 * 1000);
}

module.exports = { startBillingJobs, runAllJobs };
