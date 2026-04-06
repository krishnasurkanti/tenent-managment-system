const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
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
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    floorNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    sharingType: {
      type: String,
      required: true,
      trim: true,
    },
    totalBeds: {
      type: Number,
      required: true,
      min: 1,
    },
    occupiedBeds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

roomSchema.index({ ownerId: 1, hostelId: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model("Room", roomSchema);
