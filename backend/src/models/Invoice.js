const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    hostel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    cycle_start: {
      type: Date,
      required: true,
      index: true,
    },
    cycle_end: {
      type: Date,
      required: true,
      index: true,
    },
    effective_tenants: {
      type: Number,
      required: true,
      min: 0,
    },
    plan_applied: {
      type: String,
      enum: ["starter", "growth", "pro", "scale"],
      required: true,
    },
    extra_tenants: {
      type: Number,
      required: true,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["paid", "pending"],
      default: "pending",
      index: true,
    },
    finalized: {
      type: Boolean,
      default: false,
    },
    payment_provider: {
      type: String,
      enum: ["manual", "razorpay"],
      default: "manual",
    },
    razorpay_order_id: {
      type: String,
      default: "",
      index: true,
    },
    razorpay_payment_id: {
      type: String,
      default: "",
      index: true,
    },
    razorpay_signature: {
      type: String,
      default: "",
    },
    payment_note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

invoiceSchema.index({ hostel_id: 1, cycle_start: 1, cycle_end: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
