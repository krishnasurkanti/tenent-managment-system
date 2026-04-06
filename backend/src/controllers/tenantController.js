const Hostel = require("../models/Hostel");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");

async function getTenants(req, res, next) {
  try {
    const query = { ownerId: req.user.id };

    if (req.query.hostelId) {
      query.hostelId = req.query.hostelId;
    }

    const tenants = await Tenant.find(query)
      .populate("hostelId", "name")
      .populate("roomId", "roomNumber floorNumber sharingType")
      .sort({ createdAt: -1 });

    return res.json(tenants);
  } catch (error) {
    return next(error);
  }
}

async function getTenantById(req, res, next) {
  try {
    const tenant = await Tenant.findOne({ _id: req.params.id, ownerId: req.user.id })
      .populate("hostelId", "name")
      .populate("roomId", "roomNumber floorNumber sharingType");

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    return res.json(tenant);
  } catch (error) {
    return next(error);
  }
}

async function createTenant(req, res, next) {
  try {
    const {
      hostelId,
      roomId,
      fullName,
      phone,
      email,
      emergencyContact,
      idNumber,
      monthlyRent,
      billingAnchorDay,
      moveInDate,
      nextDueDate,
    } = req.body;

    if (!hostelId || !roomId || !fullName || !phone || monthlyRent === undefined || !billingAnchorDay || !moveInDate || !nextDueDate) {
      return res.status(400).json({ message: "Missing required tenant fields." });
    }

    const hostel = await Hostel.findOne({ _id: hostelId, ownerId: req.user.id });
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found for this owner." });
    }

    const room = await Room.findOne({ _id: roomId, hostelId, ownerId: req.user.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found for this owner." });
    }

    if (room.occupiedBeds >= room.totalBeds) {
      return res.status(400).json({ message: "Room is already full." });
    }

    const tenant = await Tenant.create({
      ownerId: req.user.id,
      hostelId,
      roomId,
      fullName,
      phone,
      email,
      emergencyContact,
      idNumber,
      monthlyRent,
      billingAnchorDay,
      moveInDate,
      nextDueDate,
    });

    room.occupiedBeds += 1;
    await room.save();

    return res.status(201).json(tenant);
  } catch (error) {
    return next(error);
  }
}

async function updateTenant(req, res, next) {
  try {
    const tenant = await Tenant.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    Object.assign(tenant, req.body);
    await tenant.save();

    return res.json(tenant);
  } catch (error) {
    return next(error);
  }
}

async function deleteTenant(req, res, next) {
  try {
    const tenant = await Tenant.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    if (tenant.isActive) {
      const room = await Room.findOne({ _id: tenant.roomId, ownerId: req.user.id });
      if (room && room.occupiedBeds > 0) {
        room.occupiedBeds -= 1;
        await room.save();
      }
    }

    await tenant.deleteOne();
    return res.json({ message: "Tenant deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getTenants, getTenantById, createTenant, updateTenant, deleteTenant };
