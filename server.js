const express = require("express");
const path = require("path");
const { pool, waitForDatabase } = require("./src/db/pool");
const { migrate } = require("./src/db/migrate");
const { seed } = require("./src/db/seed");
const authRoutes = require("./src/routes/auth.routes");
const doctorRoutes = require("./src/routes/doctors.routes");
const appointmentRoutes = require("./src/routes/appointments.routes");
const waitingListRoutes = require("./src/routes/waiting-list.routes");
const offerRoutes = require("./src/routes/offers.routes");
const offerExpirySweeper = require("./src/services/offerExpirySweeper");

const PORT = Number(process.env.PORT || 4300);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", async (req, res, next) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true, service: "medbook" });
  } catch (error) {
    next(error);
  }
});

app.use("/api", authRoutes);
app.use("/api", doctorRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", waitingListRoutes);
app.use("/api", offerRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Không tìm thấy API" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, req, res, _next) => {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: error.message || "Lỗi máy chủ" });
});

async function migrateAndSeed(options = {}) {
  await migrate();
  await seed(options);
}

async function start() {
  await waitForDatabase();
  await migrateAndSeed();
  app.listen(PORT, () => {
    console.log(`MedBook đang chạy tại http://localhost:${PORT}`);
  });
  // BR-05/BR-06: sweeper quét offer hết hạn. NFR-08: tắt được bằng OFFER_ENGINE_ENABLED=false.
  if (process.env.OFFER_ENGINE_ENABLED !== "false") {
    offerExpirySweeper.start();
  }
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { app, pool, migrateAndSeed, waitForDatabase };
