const { trackDailyTenantCounts, runInvoiceCycleJob } = require("../services/ownerBillingService");
const { createBackup } = require("../services/backupService");

let started = false;

async function runAllJobs() {
  await trackDailyTenantCounts();
  await runInvoiceCycleJob();
}

function scheduleAtMidnight(fn) {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  setTimeout(() => {
    fn().catch((err) => console.error("[midnight-job] failed:", err.message));
    scheduleAtMidnight(fn);
  }, ms);
  console.log(`[midnight-job] next run in ${Math.round(ms / 60000)} min`);
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

  scheduleAtMidnight(() => createBackup("auto"));
}

module.exports = { startBillingJobs, runAllJobs };
