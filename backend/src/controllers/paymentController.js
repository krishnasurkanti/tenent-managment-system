const Hostel = require("../models/Hostel");
const Payment = require("../models/Payment");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");
const { calculateNextDueDate, getRentStatus } = require("../utils/rent");

async function getPayments(req, res, next) {
  try {
    const query = { ownerId: req.user.id };

    if (req.query.hostelId) {
      query.hostelId = req.query.hostelId;
    }

    if (req.query.tenantId) {
      query.tenantId = req.query.tenantId;
    }

    const payments = await Payment.find(query)
      .populate("tenantId", "fullName monthlyRent")
      .populate("hostelId", "name")
      .populate("roomId", "roomNumber floorNumber")
      .sort({ createdAt: -1 });

    return res.json(payments);
  } catch (error) {
    return next(error);
  }
}

async function getPaymentById(req, res, next) {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, ownerId: req.user.id })
      .populate("tenantId", "fullName monthlyRent")
      .populate("hostelId", "name")
      .populate("roomId", "roomNumber floorNumber");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    return res.json(payment);
  } catch (error) {
    return next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const { hostelId, roomId, tenantId, amount, dueDate, paidOn, note } = req.body;

    if (!hostelId || !roomId || !tenantId || amount === undefined || !dueDate) {
      return res.status(400).json({ message: "hostelId, roomId, tenantId, amount, and dueDate are required." });
    }

    const [hostel, room, tenant] = await Promise.all([
      Hostel.findOne({ _id: hostelId, ownerId: req.user.id }),
      Room.findOne({ _id: roomId, ownerId: req.user.id }),
      Tenant.findOne({ _id: tenantId, ownerId: req.user.id }),
    ]);

    if (!hostel || !room || !tenant) {
      return res.status(404).json({ message: "Linked hostel, room, or tenant was not found for this owner." });
    }

    const normalizedPaidOn = paidOn ? new Date(paidOn) : null;
    const payment = await Payment.create({
      ownerId: req.user.id,
      hostelId,
      roomId,
      tenantId,
      amount,
      dueDate,
      paidOn: normalizedPaidOn,
      note,
      status: getRentStatus(dueDate, normalizedPaidOn),
    });

    if (normalizedPaidOn) {
      tenant.lastPaidOn = normalizedPaidOn;
      tenant.nextDueDate = calculateNextDueDate(tenant.billingAnchorDay, normalizedPaidOn);
      await tenant.save();
    }

    return res.status(201).json(payment);
  } catch (error) {
    return next(error);
  }
}

async function updatePayment(req, res, next) {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    const nextPaidOn = req.body.paidOn !== undefined ? req.body.paidOn : payment.paidOn;
    const nextDueDate = req.body.dueDate ?? payment.dueDate;

    Object.assign(payment, req.body);
    payment.status = getRentStatus(nextDueDate, nextPaidOn);
    await payment.save();

    return res.json(payment);
  } catch (error) {
    return next(error);
  }
}

async function deletePayment(req, res, next) {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    return res.json({ message: "Payment deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getPayments, getPaymentById, createPayment, updatePayment, deletePayment };
