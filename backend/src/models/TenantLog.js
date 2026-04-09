const mongoose = require("mongoose");

const tenantLogSchema = new mongoose.Schema(
  {
    hostel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    active_tenant_count: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

tenantLogSchema.index({ hostel_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("TenantLog", tenantLogSchema);
