const express = require("express");
const authService = require("../services/authService");
const { demoAuth } = require("../middleware/demoAuth");

const router = express.Router();

router.get("/demo-users", async (req, res, next) => {
  try {
    res.json({ data: await authService.listDemoUsers() });
  } catch (error) {
    next(error);
  }
});

router.post("/demo-login", async (req, res, next) => {
  try {
    res.json({ data: await authService.login(req.body) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", demoAuth, (req, res) => {
  res.json({ data: req.user });
});

module.exports = router;
