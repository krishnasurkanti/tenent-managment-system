const Hostel = require("../models/Hostel");

async function getHostels(req, res, next) {
  try {
    const hostels = await Hostel.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    return res.json(hostels);
  } catch (error) {
    return next(error);
  }
}

async function getHostelById(req, res, next) {
  try {
    const hostel = await Hostel.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found." });
    }

    return res.json(hostel);
  } catch (error) {
    return next(error);
  }
}

async function createHostel(req, res, next) {
  try {
    const { name, address, description } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: "Hostel name and address are required." });
    }

    const hostel = await Hostel.create({
      ownerId: req.user.id,
      name,
      address,
      description,
    });

    return res.status(201).json(hostel);
  } catch (error) {
    return next(error);
  }
}

async function updateHostel(req, res, next) {
  try {
    const hostel = await Hostel.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found." });
    }

    return res.json(hostel);
  } catch (error) {
    return next(error);
  }
}

async function deleteHostel(req, res, next) {
  try {
    const hostel = await Hostel.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found." });
    }

    return res.json({ message: "Hostel deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
};
