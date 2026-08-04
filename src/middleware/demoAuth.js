const authService = require("../services/authService");

async function demoAuth(req, res, next) {
  try {
    req.user = await authService.authenticateByHeader(req.header("X-Demo-User-Id"));
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { demoAuth };
