const express = require("express");
const appointmentService = require("../services/appointmentService");
const { demoAuth } = require("../middleware/demoAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

router.post("/appointments", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    const appointment = await appointmentService.bookAppointment({
      slotId: req.body.slotId,
      patientId: req.user.patientId,
      type: req.body.type,
    });
    res.status(201).json({ data: appointment });
  } catch (error) {
    next(error);
  }
});

router.get("/my-appointments", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    res.json({ data: await appointmentService.listMyAppointments(req.user.patientId) });
  } catch (error) {
    next(error);
  }
});

router.get("/appointments", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({ data: await appointmentService.listAppointmentsForStaff({ date: req.query.date }) });
  } catch (error) {
    next(error);
  }
});

router.post("/appointments/:id/confirm", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({ data: await appointmentService.confirmAppointment(req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.post("/appointments/:id/cancel", demoAuth, async (req, res, next) => {
  try {
    res.json({
      data: await appointmentService.cancelAppointment({
        appointmentId: req.params.id,
        user: req.user,
      }),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
