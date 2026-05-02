const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    join_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    current_plan: {
      type: String,
      enum: ["free", "starter", "growth", "pro"],
      default: "free",
    },
    billing_cycle_start: {
      type: Date,
      default: Date.now,
      index: true,
    },
    billing_cycle_end: {
      type: Date,
      default: () => {
        const now = new Date();
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        return next;
      },
      index: true,
    },
    billing_override: {
      effective_tenants: {
        type: Number,
        default: null,
        min: 0,
      },
      plan: {
        type: String,
        enum: ["free", "starter", "growth", "pro", null],
        default: null,
      },
      note: {
        type: String,
        default: "",
        trim: true,
      },
    },
    free_months_remaining: {
      type: Number,
      default: 0,
      min: 0,
    },
    auto_pay_enabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Hostel", hostelSchema);
