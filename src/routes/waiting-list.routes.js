const express = require("express");
const waitingListService = require("../services/waitingListService");
const { demoAuth } = require("../middleware/demoAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// ① US-01 (AC-01.1 → AC-01.5)
router.post("/waiting-list", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    const entry = await waitingListService.createEntry({
      user: req.user,
      patientId: req.body.patientId,
      doctorId: req.body.doctorId,
      specializationId: req.body.specializationId,
      medicalPriority: req.body.medicalPriority,
      preferredType: req.body.preferredType,
      desiredFrom: req.body.desiredFrom,
      desiredTo: req.body.desiredTo,
      note: req.body.note,
    });
    res.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
});

// ② US-07 (AC-07.1, AC-07.2)
router.get("/waiting-list", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({
      data: await waitingListService.listForStaff({
        status: req.query.status,
        doctorId: req.query.doctorId,
        specializationId: req.query.specializationId,
      }),
    });
  } catch (error) {
    next(error);
  }
});

// ③
router.put("/waiting-list/:id", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    const entry = await waitingListService.updateEntry({
      id: req.params.id,
      medicalPriority: req.body.medicalPriority,
      preferredType: req.body.preferredType,
      desiredFrom: req.body.desiredFrom,
      desiredTo: req.body.desiredTo,
      note: req.body.note,
    });
    res.json({ data: entry });
  } catch (error) {
    next(error);
  }
});

// ④ US-07 (AC-07.3, AC-07.4)
router.delete("/waiting-list/:id", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({ data: await waitingListService.cancelEntry({ user: req.user, id: req.params.id }) });
  } catch (error) {
    next(error);
  }
});

// ⑤
router.get("/my-waiting-list", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    res.json({ data: await waitingListService.listMine(req.user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
