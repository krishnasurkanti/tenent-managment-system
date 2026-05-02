const PLAN_SLABS = [
  { id: "free", label: "Free Trial", price: 0, limit: 25, extra_per_tenant: 0, hostel_limit: 1, extra_per_hostel: 0, trial_only: true },
  { id: "starter", label: "Silver", price: 299, limit: 50, extra_per_tenant: 10, hostel_limit: 1, extra_per_hostel: 199 },
  { id: "growth", label: "Gold", price: 499, limit: 150, extra_per_tenant: 8, hostel_limit: 3, extra_per_hostel: 199 },
  { id: "pro", label: "Diamond", price: 799, limit: 300, extra_per_tenant: 5, hostel_limit: 5, extra_per_hostel: 199 },
];

const PLAN_IDS = PLAN_SLABS.map((plan) => plan.id);
const PAID_PLAN_IDS = PLAN_SLABS.filter((plan) => !plan.trial_only).map((plan) => plan.id);

module.exports = { PLAN_SLABS, PLAN_IDS, PAID_PLAN_IDS };
