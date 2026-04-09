const mongoose = require("mongoose");

const upgradeRequestSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currentPlan: {
      type: String,
      enum: ["starter", "growth", "pro", "scale"],
      required: true,
    },
    requestedPlan: {
      type: String,
      enum: ["starter", "growth", "pro", "scale"],
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UpgradeRequest", upgradeRequestSchema);
