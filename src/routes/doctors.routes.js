const express = require("express");
const doctorRepository = require("../repositories/doctorRepository");
const slotRepository = require("../repositories/slotRepository");
const slotService = require("../services/slotService");
const { demoAuth } = require("../middleware/demoAuth");
const { requireRole } = require("../middleware/requireRole");
const { toInt } = require("../utils/validate");

const router = express.Router();

router.get("/specializations", demoAuth, async (req, res, next) => {
  try {
    res.json({ data: await doctorRepository.listSpecializations() });
  } catch (error) {
    next(error);
  }
});

router.get("/doctors", demoAuth, async (req, res, next) => {
  try {
    res.json({
      data: await doctorRepository.searchDoctors({
        specializationId: toInt(req.query.specializationId),
        q: String(req.query.q || "").trim(),
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/doctors/:id/slots", demoAuth, async (req, res, next) => {
  try {
    res.json({
      data: await slotRepository.listAvailableByDoctor(toInt(req.params.id), req.query.date),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/slots/available", demoAuth, async (req, res, next) => {
  try {
    res.json({ data: await slotRepository.listAvailable() });
  } catch (error) {
    next(error);
  }
});

router.get("/slots", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({ data: await slotService.listManageableSlots({ date: req.query.date }) });
  } catch (error) {
    next(error);
  }
});

router.post("/slots", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.status(201).json({ data: await slotService.createSlot(req.body) });
  } catch (error) {
    next(error);
  }
});

router.put("/slots/:id", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({ data: await slotService.updateSlot({ id: req.params.id, ...req.body }) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
