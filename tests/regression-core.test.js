/**
 * Regression suite — chỉ test các tính năng "cũ" đã có sẵn ở nhánh main:
 * demo auth, danh mục bác sĩ/chuyên khoa, quản lý slot, đặt/hủy/xác nhận lịch hẹn.
 *
 * KHÔNG được thêm test cho bất kỳ tính năng mới nào vào file này — file này không được
 * biết/giả định gì về tính năng bạn sắp thêm. Test của tính năng mới nên nằm ở file riêng.
 * Mục đích: học viên chạy `npm test` (hoặc `node --test tests/regression-core.test.js`)
 * SAU KHI implement tính năng bổ sung, để đảm bảo các luồng cũ không bị vỡ.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { app, migrateAndSeed, pool } = require("../server");

let server;
let baseUrl;

function headers(userId) {
  return {
    "Content-Type": "application/json",
    "X-Demo-User-Id": String(userId),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  return { response, body };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Người đặt sẵn qua seed (src/db/seed.js):
// user 1 = patient (patientId 1, slot 2 đang booked ở appointment 1)
// user 2 = staff
// user 3 = patient (patientId 2, slot 7 đang confirmed ở appointment 2)
const PATIENT_1 = 1;
const STAFF = 2;
const PATIENT_2 = 3;

test.before(async () => {
  await migrateAndSeed({ reset: true });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(async () => {
  await migrateAndSeed({ reset: true });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await pool.end();
});

// ---------- Health & routing ----------

test("health endpoint is ready", async () => {
  const { response, body } = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
});

test("unknown /api route returns 404", async () => {
  const { response, body } = await request("/api/khong-ton-tai");
  assert.equal(response.status, 404);
  assert.equal(body.error, "Không tìm thấy API");
});

// ---------- Auth ----------

test("GET /api/me without header is rejected", async () => {
  const { response, body } = await request("/api/me");
  assert.equal(response.status, 401);
  assert.equal(body.error, "Thiếu tài khoản demo");
});

test("GET /api/me with non-numeric header is rejected", async () => {
  const { response, body } = await request("/api/me", { headers: headers("abc") });
  assert.equal(response.status, 401);
  assert.equal(body.error, "Tài khoản demo không hợp lệ");
});

test("GET /api/me with unknown user id is rejected", async () => {
  const { response, body } = await request("/api/me", { headers: headers(9999) });
  assert.equal(response.status, 401);
  assert.equal(body.error, "Không tìm thấy tài khoản demo");
});

test("GET /api/me returns the current patient", async () => {
  const { response, body } = await request("/api/me", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.equal(body.data.id, PATIENT_1);
  assert.equal(body.data.role, "patient");
  assert.equal(body.data.patientId, 1);
});

test("GET /api/me returns the current staff", async () => {
  const { response, body } = await request("/api/me", { headers: headers(STAFF) });
  assert.equal(response.status, 200);
  assert.equal(body.data.role, "staff");
  assert.equal(body.data.patientId, null);
});

test("GET /api/demo-users lists demo accounts without exposing passwords", async () => {
  const { response, body } = await request("/api/demo-users", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 8);
  for (const user of body.data) {
    assert.equal(Object.prototype.hasOwnProperty.call(user, "demo_password"), false);
  }
});

test("demo login succeeds with correct credentials", async () => {
  const { response, body } = await request("/api/demo-login", {
    method: "POST",
    body: JSON.stringify({ email: "an@medbook.local", password: "demo123" }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.user.email, "an@medbook.local");
  assert.equal(body.data.user.role, "patient");
  assert.equal(Object.prototype.hasOwnProperty.call(body.data.user, "demo_password"), false);
});

test("demo login requires a correct password", async () => {
  const { response, body } = await request("/api/demo-login", {
    method: "POST",
    body: JSON.stringify({ email: "an@medbook.local", password: "sai-mat-khau" }),
  });
  assert.equal(response.status, 401);
  assert.equal(body.error, "Sai email hoặc mật khẩu demo");
});

test("demo login cannot be bypassed with userId alone", async () => {
  const { response } = await request("/api/demo-login", {
    method: "POST",
    body: JSON.stringify({ userId: 2 }),
  });
  assert.equal(response.status, 400);
});

test("staff is blocked from patient-only booking endpoint", async () => {
  const { response, body } = await request("/api/appointments", {
    method: "POST",
    headers: headers(STAFF),
    body: JSON.stringify({ slotId: 1, type: "online" }),
  });
  assert.equal(response.status, 403);
  assert.equal(body.error, "Không đủ quyền");
});

// ---------- Doctors / specializations / slots (đọc) ----------

test("GET /api/specializations lists all specializations", async () => {
  const { response, body } = await request("/api/specializations", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 5);
});

test("GET /api/doctors lists all doctors with availableSlots count", async () => {
  const { response, body } = await request("/api/doctors", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 6);
  assert.ok(body.data.every((doctor) => "availableSlots" in doctor));
});

test("GET /api/doctors filters by specializationId", async () => {
  const { response, body } = await request("/api/doctors?specializationId=1", {
    headers: headers(PATIENT_1),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 2);
  assert.ok(body.data.every((doctor) => doctor.specializationId === 1));
});

test("GET /api/doctors filters by name (case-insensitive)", async () => {
  const { response, body } = await request("/api/doctors?q=mai", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.ok(body.data.length >= 1);
  assert.ok(body.data.every((doctor) => doctor.name.toLowerCase().includes("mai")));
});

test("GET /api/doctors/:id/slots only returns available slots", async () => {
  const { response, body } = await request("/api/doctors/1/slots", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.ok(body.data.every((slot) => slot.status === "available"));
  assert.ok(!body.data.some((slot) => slot.id === 2)); // slot 2 đang booked theo seed
});

test("GET /api/slots/available excludes booked slots", async () => {
  const { response, body } = await request("/api/slots/available", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.ok(body.data.some((slot) => slot.id === 1));
  assert.ok(!body.data.some((slot) => slot.id === 2));
  assert.ok(!body.data.some((slot) => slot.id === 7));
});

test("patient cannot list manageable slots", async () => {
  const { response, body } = await request("/api/slots", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 403);
  assert.equal(body.error, "Không đủ quyền");
});

test("staff lists manageable slots including booked ones", async () => {
  const { response, body } = await request("/api/slots", { headers: headers(STAFF) });
  assert.equal(response.status, 200);
  assert.ok(body.data.some((slot) => slot.id === 2 && slot.status === "booked"));
});

test("staff filters manageable slots by date", async () => {
  const available = await request("/api/slots/available", { headers: headers(PATIENT_1) });
  const today = available.body.data.find((slot) => slot.id === 1).date;
  const tomorrow = addDays(today, 1);

  const { response, body } = await request(`/api/slots?date=${tomorrow}`, { headers: headers(STAFF) });
  assert.equal(response.status, 200);
  assert.ok(body.data.every((slot) => slot.date === tomorrow));
  assert.ok(!body.data.some((slot) => slot.id === 1)); // slot 1 là của hôm nay
});

// ---------- Slot management (staff) ----------

test("staff cannot create a slot missing required fields", async () => {
  const { response, body } = await request("/api/slots", {
    method: "POST",
    headers: headers(STAFF),
    body: JSON.stringify({ date: "2099-01-20", startTime: "11:00", endTime: "11:30" }),
  });
  assert.equal(response.status, 400);
  assert.equal(body.error, "Thiếu doctorId");
});

test("patient cannot create a slot", async () => {
  const { response, body } = await request("/api/slots", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: JSON.stringify({ doctorId: 1, date: "2099-01-20", startTime: "11:00", endTime: "11:30" }),
  });
  assert.equal(response.status, 403);
  assert.equal(body.error, "Không đủ quyền");
});

test("updating a non-existent slot returns 404", async () => {
  const { response, body } = await request("/api/slots/9999", {
    method: "PUT",
    headers: headers(STAFF),
    body: JSON.stringify({ status: "available" }),
  });
  assert.equal(response.status, 404);
  assert.equal(body.error, "Không tìm thấy khung giờ");
});

test("updating a slot with an invalid status is rejected", async () => {
  const { response, body } = await request("/api/slots/1", {
    method: "PUT",
    headers: headers(STAFF),
    body: JSON.stringify({ status: "not-a-status" }),
  });
  assert.equal(response.status, 400);
  assert.equal(body.error, "Trạng thái slot không hợp lệ");
});

test("staff can create a new available slot", async () => {
  const { response, body } = await request("/api/slots", {
    method: "POST",
    headers: headers(STAFF),
    body: JSON.stringify({
      doctorId: 2,
      date: "2099-01-20",
      startTime: "11:00",
      endTime: "11:30",
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.data.doctorId, 2);
  assert.equal(body.data.date, "2099-01-20");
  assert.equal(body.data.startTime, "11:00");
  assert.equal(body.data.endTime, "11:30");
  assert.equal(body.data.status, "available");
});

test("staff can update slot status", async () => {
  const { response, body } = await request("/api/slots/3", {
    method: "PUT",
    headers: headers(STAFF),
    body: JSON.stringify({ status: "booked" }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.id, 3);
  assert.equal(body.data.status, "booked");
});

test("staff cannot reopen a slot that still has an active appointment", async () => {
  // Slot 2 đang giữ appointment 1 ở trạng thái booked theo seed.
  const { response, body } = await request("/api/slots/2", {
    method: "PUT",
    headers: headers(STAFF),
    body: JSON.stringify({ status: "available" }),
  });
  assert.equal(response.status, 409);
  assert.equal(body.error, "Không thể mở lại khung giờ đang có lịch hẹn");
});

test("staff can reopen a slot once its appointment is cancelled", async () => {
  await request("/api/appointments/1/cancel", {
    method: "POST",
    headers: headers(STAFF),
    body: "{}",
  });
  const { response, body } = await request("/api/slots/2", {
    method: "PUT",
    headers: headers(STAFF),
    body: JSON.stringify({ status: "available" }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.status, "available");
});

// ---------- Booking (patient) ----------

test("patient can book an available slot", async () => {
  const { response, body } = await request("/api/appointments", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: JSON.stringify({ slotId: 1, type: "online" }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.data.slotId, 1);
  assert.equal(body.data.status, "booked");
  assert.equal(body.data.type, "online");
});

test("patient cannot book an already booked slot", async () => {
  const { response, body } = await request("/api/appointments", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: JSON.stringify({ slotId: 2, type: "in_person" }),
  });
  assert.equal(response.status, 409);
  assert.equal(body.error, "Khung giờ đã được đặt");
});

test("concurrent booking of the same slot produces exactly one success", async () => {
  const book = () =>
    request("/api/appointments", {
      method: "POST",
      headers: headers(PATIENT_1),
      body: JSON.stringify({ slotId: 1, type: "in_person" }),
    });

  const results = await Promise.all([book(), book()]);
  const statuses = results.map((item) => item.response.status).sort();
  assert.deepEqual(statuses, [201, 409]);
});

test("booking without slotId is rejected", async () => {
  const { response, body } = await request("/api/appointments", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: JSON.stringify({ type: "online" }),
  });
  assert.equal(response.status, 400);
  assert.equal(body.error, "Thiếu slotId");
});

test("booking a non-existent slot returns 404", async () => {
  const { response, body } = await request("/api/appointments", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: JSON.stringify({ slotId: 9999, type: "online" }),
  });
  assert.equal(response.status, 404);
  assert.equal(body.error, "Không tìm thấy khung giờ");
});

test("GET /api/my-appointments only returns the caller's own appointments", async () => {
  const { response, body } = await request("/api/my-appointments", { headers: headers(PATIENT_1) });
  assert.equal(response.status, 200);
  assert.ok(body.data.every((appointment) => appointment.patientId === 1));
  assert.ok(body.data.some((appointment) => appointment.id === 1));
  assert.ok(!body.data.some((appointment) => appointment.id === 2)); // thuộc patient khác
});

// ---------- Appointment actions (staff) ----------

test("staff lists appointments and can filter by date", async () => {
  const list = await request("/api/appointments", { headers: headers(STAFF) });
  assert.equal(list.response.status, 200);
  assert.ok(list.body.data.length >= 2);

  const today = list.body.data.find((appointment) => appointment.id === 1).date;
  const tomorrow = addDays(today, 1);
  const filtered = await request(`/api/appointments?date=${tomorrow}`, { headers: headers(STAFF) });
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.body.data.length, 0); // không có lịch hẹn nào ở seed cho ngày mai
});

test("staff confirms booked appointment", async () => {
  const { response, body } = await request("/api/appointments/1/confirm", {
    method: "POST",
    headers: headers(STAFF),
    body: "{}",
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.id, 1);
  assert.equal(body.data.status, "confirmed");
});

test("patient cannot confirm an appointment", async () => {
  const { response, body } = await request("/api/appointments/1/confirm", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  assert.equal(response.status, 403);
  assert.equal(body.error, "Không đủ quyền");
});

test("confirming an already-confirmed appointment fails", async () => {
  const { response, body } = await request("/api/appointments/2/confirm", {
    method: "POST",
    headers: headers(STAFF),
    body: "{}",
  });
  assert.equal(response.status, 409);
  assert.equal(body.error, "Chỉ xác nhận được lịch đang chờ xác nhận");
});

test("confirming a non-existent appointment fails", async () => {
  const { response, body } = await request("/api/appointments/9999/confirm", {
    method: "POST",
    headers: headers(STAFF),
    body: "{}",
  });
  assert.equal(response.status, 409);
  assert.equal(body.error, "Chỉ xác nhận được lịch đang chờ xác nhận");
});

// ---------- Cancel (quyền sở hữu) ----------

test("a patient cannot cancel another patient's appointment", async () => {
  // appointment 2 thuộc patient 2 (user 3), không phải user 1.
  const { response, body } = await request("/api/appointments/2/cancel", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  assert.equal(response.status, 403);
  assert.equal(body.error, "Không đủ quyền");
});

test("the actual owner can cancel their own appointment", async () => {
  const { response, body } = await request("/api/appointments/2/cancel", {
    method: "POST",
    headers: headers(PATIENT_2),
    body: "{}",
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.status, "cancelled");
});

test("staff can cancel any appointment regardless of ownership", async () => {
  const { response, body } = await request("/api/appointments/1/cancel", {
    method: "POST",
    headers: headers(STAFF),
    body: "{}",
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.status, "cancelled");
});

test("cancelling a non-existent appointment returns 404", async () => {
  const { response, body } = await request("/api/appointments/9999/cancel", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  assert.equal(response.status, 404);
  assert.equal(body.error, "Không tìm thấy lịch hẹn");
});

test("cancelling an already-cancelled appointment fails", async () => {
  await request("/api/appointments/1/cancel", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  const { response, body } = await request("/api/appointments/1/cancel", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  assert.equal(response.status, 409);
  assert.equal(body.error, "Lịch hẹn đã bị hủy");
});

test("owner patient can cancel their own appointment", async () => {
  const { response, body } = await request("/api/appointments/1/cancel", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.status, "cancelled");
});

test("cancel appointment returns its slot to available", async () => {
  const cancel = await request("/api/appointments/1/cancel", {
    method: "POST",
    headers: headers(PATIENT_1),
    body: "{}",
  });
  assert.equal(cancel.response.status, 200);
  assert.equal(cancel.body.data.status, "cancelled");

  const slots = await request(`/api/doctors/1/slots?date=${cancel.body.data.date}`, {
    headers: headers(PATIENT_1),
  });
  assert.equal(slots.response.status, 200);
  assert.ok(slots.body.data.some((slot) => slot.id === 2 && slot.status === "available"));
});
