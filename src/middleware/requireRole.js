function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Không đủ quyền" });
    }
    next();
  };
}

module.exports = { requireRole };
