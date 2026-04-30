const { trackDailyTenantCounts, runInvoiceCycleJob } = require("../services/ownerBillingService");

let started = false;

async function runAllJobs() {
  await trackDailyTenantCounts();
  await runInvoiceCycleJob();
}

function startBillingJobs() {
  if (started) return;
  started = true;

  runAllJobs().catch((error) => {
    console.error("[billing-jobs] bootstrap run failed:", error.message);
  });

  setInterval(() => {
    runAllJobs().catch((error) => {
      console.error("[billing-jobs] interval run failed:", error.message);
    });
  }, 24 * 60 * 60 * 1000);
}

module.exports = { startBillingJobs, runAllJobs };
