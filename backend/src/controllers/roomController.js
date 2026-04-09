const Hostel = require("../models/Hostel");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");

async function getRooms(req, res, next) {
  try {
    const query = { ownerId: req.user.id };

    if (req.query.hostelId) {
      query.hostelId = req.query.hostelId;
    }

    const rooms = await Room.find(query).sort({ floorNumber: 1, roomNumber: 1 });
    const enrichedRooms = rooms.map((room) => ({
      ...room.toObject(),
      availableBeds: Math.max(room.totalBeds - room.occupiedBeds, 0),
    }));

    return res.json(enrichedRooms);
  } catch (error) {
    return next(error);
  }
}

async function getRoomById(req, res, next) {
  try {
    const room = await Room.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    return res.json({
      ...room.toObject(),
      availableBeds: Math.max(room.totalBeds - room.occupiedBeds, 0),
    });
  } catch (error) {
    return next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const { hostelId, roomNumber, floorNumber, sharingType, totalBeds } = req.validatedBody;

    const hostel = await Hostel.findOne({ _id: hostelId, ownerId: req.user.id });
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found for this owner." });
    }

    const room = await Room.create({
      ownerId: req.user.id,
      hostelId,
      roomNumber,
      floorNumber,
      sharingType,
      totalBeds,
    });

    return res.status(201).json({
      ...room.toObject(),
      availableBeds: room.totalBeds,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const room = await Room.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const patch = req.validatedBody;
    const nextTotalBeds = patch.totalBeds ?? room.totalBeds;
    if (nextTotalBeds < room.occupiedBeds) {
      return res.status(400).json({ message: "totalBeds cannot be less than occupiedBeds." });
    }

    Object.assign(room, patch, { totalBeds: nextTotalBeds });
    await room.save();

    return res.json({
      ...room.toObject(),
      availableBeds: Math.max(room.totalBeds - room.occupiedBeds, 0),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteRoom(req, res, next) {
  try {
    const activeTenants = await Tenant.countDocuments({
      ownerId: req.user.id,
      roomId: req.params.id,
      isActive: true,
    });

    if (activeTenants > 0) {
      return res.status(400).json({ message: "Cannot delete a room that still has active tenants." });
    }

    const room = await Room.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    return res.json({ message: "Room deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getRooms, getRoomById, createRoom, updateRoom, deleteRoom };
