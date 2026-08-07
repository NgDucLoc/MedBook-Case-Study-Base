const express = require("express");
const offerEngineService = require("../services/offerEngineService");
const { demoAuth } = require("../middleware/demoAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// ⑤ US-03 (AC-03.1 → AC-03.4)
router.get("/my-offers", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    res.json({
      data: await offerEngineService.listMyOffers(req.user.patientId, {
        includeHistory: req.query.includeHistory === "true",
      }),
    });
  } catch (error) {
    next(error);
  }
});

// ⑥ US-04 (AC-04.1 → AC-04.6) ⭐
router.post("/offers/:id/accept", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    const appointment = await offerEngineService.acceptOffer({ offerId: req.params.id, user: req.user });
    res.status(201).json({ data: appointment });
  } catch (error) {
    next(error);
  }
});

// ⑦ US-05 (AC-05.1 → AC-05.4)
router.post("/offers/:id/decline", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    const result = await offerEngineService.declineOffer({
      offerId: req.params.id,
      user: req.user,
      reason: req.body.reason,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// ⑧ US-07
router.get("/offers", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({
      data: await offerEngineService.listForStaff({
        slotId: req.query.slotId,
        patientId: req.query.patientId,
        status: req.query.status,
      }),
    });
  } catch (error) {
    next(error);
  }
});

// ⑨ US-07 (AC-07.5, AC-07.6)
router.get("/offer-events", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.json({
      data: await offerEngineService.listEvents({
        slotId: req.query.slotId,
        patientId: req.query.patientId,
        limit: req.query.limit,
      }),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
