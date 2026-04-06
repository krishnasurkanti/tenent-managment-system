const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    emergencyContact: {
      type: String,
      default: "",
      trim: true,
    },
    idNumber: {
      type: String,
      default: "",
      trim: true,
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    billingAnchorDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    moveInDate: {
      type: Date,
      required: true,
    },
    lastPaidOn: {
      type: Date,
      default: null,
    },
    nextDueDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Tenant", tenantSchema);
