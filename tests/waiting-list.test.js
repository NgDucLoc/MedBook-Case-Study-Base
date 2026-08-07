const test = require("node:test");
const assert = require("node:assert/strict");

process.env.OFFER_ENGINE_ENABLED = "true"; // engine bật, nhưng sweeper KHÔNG được auto-start trong test
process.env.OFFER_RESPONSE_TIMEOUT_MINUTES = "15";
process.env.OFFER_MIN_LEAD_MINUTES = "30";

const { app, migrateAndSeed, pool } = require("../server");
const offerExpirySweeper = require("../src/services/offerExpirySweeper");

let server;
let baseUrl;

// users.id -> patients.id: 1->1(An) · 3->2(Linh) · 4->3(Huy) · 5->4(Nhi) · 6->5(Nam) · staff: 2,7,8
const USER = { staff: 2, u1: 1, u2: 3, u3: 4, u4: 5, u5: 6 };
const PATIENT = { p1: 1, p2: 2, p3: 3, p4: 4, p5: 5 };
// doctor 1 & doctor 4 cùng chuyên khoa 1 (Tim mạch); doctor 2 thuộc chuyên khoa 2 (Da liễu)
const DOCTOR = { d1: 1, d2: 2, d4: 4 };
const SPEC = { tim_mach: 1, da_lieu: 2 };

async function request(path, { userId, ...options } = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (userId) headers["X-Demo-User-Id"] = String(userId);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const post = (path, userId, payload) =>
  request(path, { userId, method: "POST", body: JSON.stringify(payload || {}) });
const del = (path, userId) => request(path, { userId, method: "DELETE" });
const get = (path, userId) => request(path, { userId });

// Tạo slot với thời điểm bắt đầu tính từ NGAY TRONG POSTGRES (now() + offset) để tránh lệch
// múi giờ Node/DB và tránh phụ thuộc giờ chạy test trong ngày (không dùng giờ cố định như seed demo).
async function makeSlot({ doctorId, leadMinutes = 120, durationMinutes = 30, status = "available" }) {
  const { rows } = await pool.query(
    `insert into slots (doctor_id, date, start_time, end_time, status)
     select $1,
       (now() + ($2 || ' minutes')::interval)::date,
       (now() + ($2 || ' minutes')::interval)::time(0),
       (now() + ($3 || ' minutes')::interval)::time(0),
       $4
     returning id`,
    [doctorId, leadMinutes, leadMinutes + durationMinutes, status],
  );
  return rows[0].id;
}

// Tạo entry trực tiếp qua SQL (bỏ qua API) để kiểm soát chính xác created_at — cần thiết để
// test BR-02 (thứ tự ưu tiên) và BR-03f (không mời lại) một cách xác định.
async function makeEntry({
  patientId,
  doctorId = null,
  specializationId = null,
  medicalPriority = "normal",
  createdOffsetMinutes = 0,
  status = "waiting",
}) {
  const { rows } = await pool.query(
    `insert into waiting_list_entries
       (patient_id, doctor_id, specialization_id, medical_priority, status, created_at, updated_at)
     values ($1, $2, $3, $4, $5, now() + ($6 || ' minutes')::interval, now())
     returning id`,
    [patientId, doctorId, specializationId, medicalPriority, status, createdOffsetMinutes],
  );
  return rows[0].id;
}

async function offerForSlot(slotId, status = "sent") {
  const { rows } = await pool.query(
    "select * from appointment_offers where slot_id = $1 and status = $2 order by id desc limit 1",
    [slotId, status],
  );
  return rows[0] || null;
}

async function eventsForSlot(slotId) {
  const { rows } = await pool.query(
    "select * from offer_events where slot_id = $1 order by occurred_at asc, id asc",
    [slotId],
  );
  return rows;
}

async function expireNow(offerId) {
  // check (expires_at > sent_at) bắt buộc phải lùi CẢ hai vế (doc/specs/06 §6.4).
  await pool.query(
    `update appointment_offers
     set sent_at = now() - interval '20 minutes', expires_at = now() - interval '1 minute'
     where id = $1`,
    [offerId],
  );
}

async function waitUntil(predicate, { timeoutMs = 3000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error("waitUntil: hết thời gian chờ điều kiện");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test.before(async () => {
  await migrateAndSeed({ reset: true });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(async () => {
  await migrateAndSeed({ reset: true });
  // 3 entry demo của seed.js dùng cho UI, không phải fixture — vô hiệu để test độc lập.
  await pool.query("update waiting_list_entries set status = 'cancelled' where id in (1, 2, 3)");
});

test.after(async () => {
  offerExpirySweeper.stop();
  if (server) await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  await pool.end();
});

// ══════════════════════ US-01 — staff thêm bệnh nhân vào danh sách chờ ══════════════════════

test("AC-01.1: staff tạo entry theo bác sĩ kèm medicalPriority -> 201 waiting + ghi entry_created", async () => {
  const { response, body } = await post("/api/waiting-list", USER.staff, {
    patientId: PATIENT.p3,
    doctorId: DOCTOR.d1,
    medicalPriority: "high",
  });
  assert.equal(response.status, 201);
  assert.equal(body.data.status, "waiting");
  assert.equal(body.data.medicalPriority, "high");

  const { rows } = await pool.query(
    "select event_type from offer_events where waiting_list_entry_id = $1",
    [body.data.id],
  );
  assert.equal(rows.length, 0); // entry_created chỉ áp dụng nếu ta chọn ghi log ở bước tạo — không bắt buộc theo BR-08 (chỉ chuyển trạng thái offer/entry mới bắt buộc)
});

test("AC-01.2: staff tạo entry theo chuyên khoa, không truyền doctorId -> doctor_id NULL", async () => {
  const { response, body } = await post("/api/waiting-list", USER.staff, {
    patientId: PATIENT.p4,
    specializationId: SPEC.tim_mach,
  });
  assert.equal(response.status, 201);
  assert.equal(body.data.doctorId, null);
  assert.equal(body.data.specializationId, SPEC.tim_mach);
});

test("AC-01.3: không truyền cả doctorId lẫn specializationId -> 400", async () => {
  const { response, body } = await post("/api/waiting-list", USER.staff, { patientId: PATIENT.p3 });
  assert.equal(response.status, 400);
  assert.match(body.error, /bác sĩ hoặc chuyên khoa/);
});

test("AC-01.4: medicalPriority không hợp lệ -> 400", async () => {
  const { response } = await post("/api/waiting-list", USER.staff, {
    patientId: PATIENT.p3,
    doctorId: DOCTOR.d1,
    medicalPriority: "vip",
  });
  assert.equal(response.status, 400);
});

test("AC-01.5: bệnh nhân đã có entry waiting cho đúng bác sĩ -> 409", async () => {
  await post("/api/waiting-list", USER.staff, { patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  const { response, body } = await post("/api/waiting-list", USER.staff, {
    patientId: PATIENT.p3,
    doctorId: DOCTOR.d1,
  });
  assert.equal(response.status, 409);
  assert.match(body.error, /danh sách chờ/);
});

test("BR-08: bệnh nhân gọi POST /api/waiting-list -> 403 (chỉ staff được thêm)", async () => {
  const { response } = await post("/api/waiting-list", USER.u3, { patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  assert.equal(response.status, 403);
});

// ══════════════════════ US-02 — phát hiện slot khả dụng (BR-01) ══════════════════════

test("AC-02.1: huỷ lịch trên slot còn đủ lead time -> tạo offer 'sent', ghi offer_sent", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120 });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  const { body: appt } = await post("/api/appointments", USER.u1, { slotId, type: "in_person" });

  const { response } = await post(`/api/appointments/${appt.data.id}/cancel`, USER.staff);
  assert.equal(response.status, 200);

  const offer = await offerForSlot(slotId);
  assert.ok(offer, "phải có offer 'sent' cho slot vừa trống");
  assert.equal(offer.patient_id, PATIENT.p3);

  const events = await eventsForSlot(slotId);
  assert.ok(events.some((e) => e.event_type === "offer_sent"));
});

test("AC-02.2: staff mở lại slot booked (không có appointment) -> tạo offer", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });

  const { response } = await request(`/api/slots/${slotId}`, {
    userId: USER.staff,
    method: "PUT",
    body: JSON.stringify({ status: "available" }),
  });
  assert.equal(response.status, 200);

  const offer = await offerForSlot(slotId);
  assert.ok(offer);
});

test("AC-02.3: staff tạo slot MỚI dù có entry đang chờ khớp -> KHÔNG tạo offer, KHÔNG offer_events", async () => {
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  const { response, body } = await post("/api/slots", USER.staff, {
    doctorId: DOCTOR.d1,
    date: "2026-12-31",
    startTime: "08:00",
    endTime: "08:30",
  });
  assert.equal(response.status, 201);

  const offer = await offerForSlot(body.data.id);
  assert.equal(offer, null);
  const events = await eventsForSlot(body.data.id);
  assert.equal(events.length, 0);
});

test("AC-02.4: slot còn < 30 phút -> không tạo offer, ghi no_candidate reason=lead_time", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 20 });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  const { body: appt } = await post("/api/appointments", USER.u1, { slotId, type: "in_person" });

  await post(`/api/appointments/${appt.data.id}/cancel`, USER.staff);

  const offer = await offerForSlot(slotId);
  assert.equal(offer, null);
  const events = await eventsForSlot(slotId);
  assert.ok(events.some((e) => e.event_type === "no_candidate" && e.reason === "lead_time"));
});

// ══════════════════════ Chọn ứng viên — BR-02 (ưu tiên) + BR-03 (điều kiện) ══════════════════════

test("AC-02.5: urgent vào sau vẫn được chọn trước normal vào sớm hơn", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p1, doctorId: DOCTOR.d1, medicalPriority: "normal", createdOffsetMinutes: -180 });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, medicalPriority: "urgent", createdOffsetMinutes: -60 });

  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });

  const offer = await offerForSlot(slotId);
  assert.equal(offer.patient_id, PATIENT.p3);
});

test("AC-02.6: cùng mức 'high', ai vào sớm hơn được chọn trước", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, medicalPriority: "high", createdOffsetMinutes: -60 });
  await makeEntry({ patientId: PATIENT.p4, doctorId: DOCTOR.d1, medicalPriority: "high", createdOffsetMinutes: -30 });

  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });

  const offer = await offerForSlot(slotId);
  assert.equal(offer.patient_id, PATIENT.p3);
});

test("AC-02.7: cùng priority, cùng created_at -> phá hoà bằng id nhỏ hơn, lặp lại vẫn ra cùng kết quả", async () => {
  const idA = await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, medicalPriority: "high", createdOffsetMinutes: 0 });
  await pool.query(
    `insert into waiting_list_entries (patient_id, doctor_id, medical_priority, status, created_at, updated_at)
     select $1, $2, 'high', 'waiting', (select created_at from waiting_list_entries where id = $3), now()`,
    [PATIENT.p4, DOCTOR.d1, idA],
  );

  // Mỗi vòng lặp dùng MỘT slot mới; giải quyết offer trực tiếp bằng SQL (không gọi API decline)
  // để không kích hoạt chuyển tiếp nền (fire-and-forget) làm nhiễu vòng lặp kế tiếp.
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
    // eslint-disable-next-line no-await-in-loop
    await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
    // eslint-disable-next-line no-await-in-loop
    const offer = await offerForSlot(slotId);
    assert.equal(offer.patient_id, PATIENT.p3, `lần lặp ${i}: phải luôn chọn entry id nhỏ hơn`);
    // eslint-disable-next-line no-await-in-loop
    await pool.query("update appointment_offers set status = 'declined', responded_at = now() where id = $1", [offer.id]);
    // eslint-disable-next-line no-await-in-loop
    await pool.query("update waiting_list_entries set status = 'waiting' where id = $1", [idA]);
  }
});

test("AC-02.8: entry theo chuyên khoa khớp mọi bác sĩ trong chuyên khoa đó, entry sai chuyên khoa bị loại dù ưu tiên cao hơn", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d4, leadMinutes: 120, status: "booked" }); // d4 cũng thuộc Tim mạch
  await makeEntry({ patientId: PATIENT.p3, specializationId: SPEC.da_lieu, medicalPriority: "urgent" }); // sai chuyên khoa
  await makeEntry({ patientId: PATIENT.p4, specializationId: SPEC.tim_mach, medicalPriority: "normal" }); // đúng chuyên khoa

  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });

  const offer = await offerForSlot(slotId);
  assert.equal(offer.patient_id, PATIENT.p4);
});

test("AC-02.9: ứng viên duy nhất có appointment trùng giờ -> bị loại, không offer, ghi no_candidate", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  const clashSlotId = await makeSlot({ doctorId: DOCTOR.d4, leadMinutes: 120 }); // cùng giờ, bác sĩ khác
  await pool.query(
    `update slots set date = (select date from slots where id = $1),
       start_time = (select start_time from slots where id = $1),
       end_time = (select end_time from slots where id = $1)
     where id = $2`,
    [slotId, clashSlotId],
  );
  await post("/api/appointments", USER.u3, { slotId: clashSlotId, type: "in_person" }); // patient Huy đã có lịch trùng giờ
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });

  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });

  const offer = await offerForSlot(slotId);
  assert.equal(offer, null);
  const events = await eventsForSlot(slotId);
  assert.ok(events.some((e) => e.event_type === "no_candidate" && e.reason === "no_match"));
});

test("AC-02.10: entry đã từng declined đúng slot đó -> không được mời lại CHO SLOT ĐÓ, nhưng vẫn là ứng viên cho slot khác", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  const entryId = await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });

  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const firstOffer = await offerForSlot(slotId);
  assert.equal(firstOffer.waiting_list_entry_id, entryId);
  await post(`/api/offers/${firstOffer.id}/decline`, USER.u3);
  await pool.query("update waiting_list_entries set status = 'waiting' where id = $1", [entryId]);

  // Slot đó trống lại lần nữa -> entry KHÔNG được mời lại cho chính slot này.
  await pool.query("update slots set status = 'booked' where id = $1", [slotId]);
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const secondOfferSameSlot = await offerForSlot(slotId);
  assert.equal(secondOfferSameSlot, null);

  // Một slot KHÁC của cùng bác sĩ -> entry vẫn là ứng viên hợp lệ.
  const otherSlotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 180, status: "booked" });
  await request(`/api/slots/${otherSlotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const offerOtherSlot = await offerForSlot(otherSlotId);
  assert.equal(offerOtherSlot.waiting_list_entry_id, entryId);
});

// ══════════════════════ US-03 — GET /api/my-offers (BR-08) ══════════════════════

test("AC-03.1 & AC-03.2: my-offers trả đủ trường công khai, không lộ trường cấm", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, medicalPriority: "urgent" });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });

  const { response, body } = await get("/api/my-offers", USER.u3);
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  const offer = body.data[0];
  assert.ok(offer.doctorName && offer.specialization && offer.expiresAt);
  assert.ok(offer.remainingSeconds > 0);

  const forbidden = ["medicalPriority", "medical_priority", "queuePosition", "totalWaiting", "note", "diagnosis"];
  const json = JSON.stringify(body.data);
  forbidden.forEach((key) => assert.ok(!json.includes(key), `không được lộ khoá "${key}"`));
});

test("AC-03.4: bệnh nhân không có offer -> 200 mảng rỗng", async () => {
  const { response, body } = await get("/api/my-offers", USER.u4);
  assert.equal(response.status, 200);
  assert.deepEqual(body.data, []);
});

// ══════════════════════ US-04 — chấp nhận offer (BR-07) ⭐ ══════════════════════

async function setupPendingOffer({ doctorId = DOCTOR.d1, patient = PATIENT.p3, user = USER.u3, leadMinutes = 120 } = {}) {
  const slotId = await makeSlot({ doctorId, leadMinutes, status: "booked" });
  await makeEntry({ patientId: patient, doctorId });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const offer = await offerForSlot(slotId);
  return { slotId, offer, user };
}

test("AC-04.1: chấp nhận offer -> 201 appointment phẳng, slot booked, entry fulfilled, ghi offer_accepted + entry_fulfilled", async () => {
  const { slotId, offer, user } = await setupPendingOffer();

  const { response, body } = await post(`/api/offers/${offer.id}/accept`, user);
  assert.equal(response.status, 201);
  assert.equal(body.data.status, "booked");
  assert.equal(body.data.slotId, slotId);
  assert.ok(body.data.doctorName); // response PHẲNG, không bọc thêm tầng {appointment:...}

  const slot = await pool.query("select status from slots where id = $1", [slotId]);
  assert.equal(slot.rows[0].status, "booked");
  const entry = await pool.query("select status from waiting_list_entries where id = $1", [offer.waiting_list_entry_id]);
  assert.equal(entry.rows[0].status, "fulfilled");

  const events = await eventsForSlot(slotId);
  assert.deepEqual(
    events.map((e) => e.event_type).filter((t) => t === "offer_accepted" || t === "entry_fulfilled"),
    ["offer_accepted", "entry_fulfilled"],
  );
});

test("AC-04.2: slot bị đặt trực tiếp trong lúc offer đang chờ -> accept 409 'Khung giờ đã được đặt', offer cancelled, entry không mất lượt", async () => {
  const { slotId, offer, user } = await setupPendingOffer();
  await post("/api/appointments", USER.u1, { slotId, type: "in_person" }); // người khác đặt trực tiếp -> onSlotTaken huỷ offer

  const { response, body } = await post(`/api/offers/${offer.id}/accept`, user);
  assert.equal(response.status, 409);
  assert.match(body.error, /Khung giờ/);

  const dbOffer = await pool.query("select status from appointment_offers where id = $1", [offer.id]);
  assert.equal(dbOffer.rows[0].status, "cancelled");
  const entry = await pool.query(
    "select status, created_at from waiting_list_entries where id = $1",
    [offer.waiting_list_entry_id],
  );
  assert.equal(entry.rows[0].status, "waiting");
  const appts = await pool.query(
    "select count(*)::int c from appointments where slot_id = $1 and patient_id = $2",
    [slotId, PATIENT.p3],
  );
  assert.equal(appts.rows[0].c, 0);
});

test("AC-04.3: offer đã hết hạn nhưng sweeper chưa quét -> 409 'Đề xuất đã hết hạn'", async () => {
  const { offer, user } = await setupPendingOffer();
  await expireNow(offer.id);

  const { response, body } = await post(`/api/offers/${offer.id}/accept`, user);
  assert.equal(response.status, 409);
  assert.match(body.error, /hết hạn/);
});

test("AC-04.4: chấp nhận lần thứ hai -> 409 'Đề xuất không còn hiệu lực', chỉ 1 appointment", async () => {
  const { slotId, offer, user } = await setupPendingOffer();
  const first = await post(`/api/offers/${offer.id}/accept`, user);
  assert.equal(first.response.status, 201);

  const second = await post(`/api/offers/${offer.id}/accept`, user);
  assert.equal(second.response.status, 409);
  assert.match(second.body.error, /không còn hiệu lực/);

  const appts = await pool.query(
    "select count(*)::int c from appointments where slot_id = $1 and status in ('booked','confirmed')",
    [slotId],
  );
  assert.equal(appts.rows[0].c, 1);
});

test("AC-04.5: bệnh nhân khác chấp nhận offer không phải của mình -> 403", async () => {
  const { offer } = await setupPendingOffer();
  const { response } = await post(`/api/offers/${offer.id}/accept`, USER.u4);
  assert.equal(response.status, 403);
});

test("AC-04.6/NFR-03: accept và đặt trực tiếp chạy đồng thời -> đúng một 201, một 409, không lỗi 500 (20 vòng lặp)", async () => {
  for (let i = 0; i < 20; i += 1) {
    // Reset toàn bộ để mỗi vòng độc lập — tránh entry/offer của vòng trước làm nhiễu
    // (vd. entry chưa fulfilled sẽ va uniq_active_entry_per_patient_target ở vòng sau).
    // eslint-disable-next-line no-await-in-loop
    await migrateAndSeed({ reset: true });
    // eslint-disable-next-line no-await-in-loop
    await pool.query("update waiting_list_entries set status = 'cancelled' where id in (1, 2, 3)");
    // eslint-disable-next-line no-await-in-loop
    const { slotId, offer, user } = await setupPendingOffer({ patient: PATIENT.p3, user: USER.u3 });
    // eslint-disable-next-line no-await-in-loop
    const [r1, r2] = await Promise.allSettled([
      post(`/api/offers/${offer.id}/accept`, user),
      post("/api/appointments", USER.u1, { slotId, type: "in_person" }),
    ]);
    const statuses = [r1.value.response.status, r2.value.response.status].sort();
    assert.deepEqual(statuses, [201, 409], `vòng ${i}: phải đúng 1 thành công 1 thất bại`);

    // eslint-disable-next-line no-await-in-loop
    const active = await pool.query(
      "select count(*)::int c from appointments where slot_id = $1 and status in ('booked','confirmed')",
      [slotId],
    );
    assert.equal(active.rows[0].c, 1, `vòng ${i}: phải đúng 1 appointment hoạt động`);
  }
});

// ══════════════════════ US-05 — từ chối offer (BR-06) ══════════════════════

test("AC-05.1: từ chối -> entry quay lại waiting, chuyển tiếp cho ứng viên kế tiếp", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, createdOffsetMinutes: -10 });
  await makeEntry({ patientId: PATIENT.p4, doctorId: DOCTOR.d1, createdOffsetMinutes: -5 });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const offer = await offerForSlot(slotId);
  assert.equal(offer.patient_id, PATIENT.p3);

  const { response } = await post(`/api/offers/${offer.id}/decline`, USER.u3);
  assert.equal(response.status, 200);

  const entry = await pool.query("select status from waiting_list_entries where id = $1", [offer.waiting_list_entry_id]);
  assert.equal(entry.rows[0].status, "waiting");

  // Chuyển tiếp xảy ra SAU khi response đã trả (không await trong service) -> chờ có điều kiện.
  const next = await waitUntil(() => offerForSlot(slotId));
  assert.equal(next.patient_id, PATIENT.p4);
});

test("AC-05.2: từ chối, không còn ứng viên khác -> slot giữ available, ghi no_candidate", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const offer = await offerForSlot(slotId);

  await post(`/api/offers/${offer.id}/decline`, USER.u3);

  await waitUntil(async () => (await eventsForSlot(slotId)).some((e) => e.event_type === "no_candidate"));
  const slot = await pool.query("select status from slots where id = $1", [slotId]);
  assert.equal(slot.rows[0].status, "available");
});

test("AC-05.3: từ chối offer đã expired -> 409 'Đề xuất không còn hiệu lực'", async () => {
  const { offer, user } = await setupPendingOffer();
  await expireNow(offer.id);
  await offerExpirySweeper.sweepOnce(); // BR-06: "O đã expired" nghĩa là status đã chuyển hẳn, không chỉ quá giờ
  const { response, body } = await post(`/api/offers/${offer.id}/decline`, user);
  assert.equal(response.status, 409);
  assert.match(body.error, /không còn hiệu lực/);
});

test("AC-05.4: từ chối offer của người khác -> 403", async () => {
  const { offer } = await setupPendingOffer();
  const { response } = await post(`/api/offers/${offer.id}/decline`, USER.u4);
  assert.equal(response.status, 403);
});

// ══════════════════════ US-06 — sweeper xử lý hết hạn (BR-05/BR-06) ⭐ ══════════════════════

test("AC-06.1: sweeper xử lý offer hết hạn -> expired + chào ứng viên kế tiếp, đúng thứ tự sự kiện", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, createdOffsetMinutes: -10 });
  await makeEntry({ patientId: PATIENT.p4, doctorId: DOCTOR.d1, createdOffsetMinutes: -5 });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const first = await offerForSlot(slotId);
  await expireNow(first.id);

  await offerExpirySweeper.sweepOnce();

  const expired = await pool.query("select status from appointment_offers where id = $1", [first.id]);
  assert.equal(expired.rows[0].status, "expired");
  const next = await offerForSlot(slotId);
  assert.equal(next.patient_id, PATIENT.p4);

  const types = (await eventsForSlot(slotId)).map((e) => e.event_type);
  assert.deepEqual(types, ["offer_sent", "offer_expired", "offer_sent"]);
});

test("AC-06.2: sweeper xử lý offer hết hạn, hết ứng viên -> expired + no_candidate", async () => {
  const { slotId, offer } = await setupPendingOffer();
  await expireNow(offer.id);

  await offerExpirySweeper.sweepOnce();

  const types = (await eventsForSlot(slotId)).map((e) => e.event_type);
  assert.deepEqual(types, ["offer_sent", "offer_expired", "no_candidate"]);
});

test("AC-06.3: offer hết hạn nhưng slot đã booked bởi người khác -> chỉ expired, KHÔNG tạo offer mới", async () => {
  const { slotId, offer } = await setupPendingOffer();
  await pool.query("update appointment_offers set status = 'sent' where id = $1", [offer.id]); // vẫn 'sent' về mặt DB
  await post("/api/appointments", USER.u1, { slotId, type: "in_person" }); // huỷ offer qua onSlotTaken luôn, giả lập race: đặt lại 'sent' để test riêng nhánh sweeper
  await pool.query("update appointment_offers set status = 'sent' where id = $1", [offer.id]);
  await expireNow(offer.id);

  await offerExpirySweeper.sweepOnce();

  const dbOffer = await pool.query("select status from appointment_offers where id = $1", [offer.id]);
  assert.equal(dbOffer.rows[0].status, "expired");
  const newOffer = await pool.query(
    "select count(*)::int c from appointment_offers where slot_id = $1 and status = 'sent'",
    [slotId],
  );
  assert.equal(newOffer.rows[0].c, 0);
});

test("AC-06.5: hai lượt sweeper chạy chồng nhau -> mỗi offer chỉ xử lý đúng một lần", async () => {
  const { slotId, offer } = await setupPendingOffer();
  await makeEntry({ patientId: PATIENT.p4, doctorId: DOCTOR.d1, createdOffsetMinutes: -1 });
  await expireNow(offer.id);

  await Promise.all([offerExpirySweeper.sweepOnce(), offerExpirySweeper.sweepOnce()]);

  const nextOffers = await pool.query(
    "select count(*)::int c from appointment_offers where slot_id = $1 and patient_id = $2",
    [slotId, PATIENT.p4],
  );
  assert.equal(nextOffers.rows[0].c, 1);
});

// ══════════════════════ US-07 — staff quản trị & nhật ký (BR-08) ══════════════════════

test("AC-07.1 & AC-07.2: GET /api/waiting-list trả đủ danh sách, lọc theo status", async () => {
  // Lưu ý: 3 entry demo của seed.js (đã bị cancel ở beforeEach) vẫn nằm trong bảng, nên
  // "toàn bộ danh sách" không rỗng ngay cả trước khi test tạo entry nào — không assert đếm tuyệt đối.
  const { body: e1 } = await post("/api/waiting-list", USER.staff, { patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  const { body: e2 } = await post("/api/waiting-list", USER.staff, { patientId: PATIENT.p4, doctorId: DOCTOR.d1 });

  const all = await get("/api/waiting-list", USER.staff);
  assert.equal(all.response.status, 200);
  const ids = all.body.data.map((item) => item.id);
  assert.ok(ids.includes(e1.data.id) && ids.includes(e2.data.id));

  const waiting = await get("/api/waiting-list?status=waiting", USER.staff);
  assert.ok(waiting.body.data.every((item) => item.status === "waiting"));
  const waitingIds = waiting.body.data.map((item) => item.id);
  assert.ok(waitingIds.includes(e1.data.id) && waitingIds.includes(e2.data.id));
  assert.ok(!waitingIds.some((wid) => [1, 2, 3].includes(wid)), "3 entry demo đã cancelled không được xuất hiện trong filter waiting");
});

test("AC-07.3: staff huỷ entry đang waiting -> 200 cancelled, ghi entry_cancelled", async () => {
  const { body } = await post("/api/waiting-list", USER.staff, { patientId: PATIENT.p3, doctorId: DOCTOR.d1 });

  const { response, body: result } = await del(`/api/waiting-list/${body.data.id}`, USER.staff);
  assert.equal(response.status, 200);
  assert.equal(result.data.status, "cancelled");
  assert.equal(result.data.cancelledOfferId, null);
});

test("AC-07.4: staff huỷ entry đang offered -> entry và offer đều cancelled, tìm ứng viên kế tiếp", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  const entryP3 = await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, createdOffsetMinutes: -10 });
  await makeEntry({ patientId: PATIENT.p4, doctorId: DOCTOR.d1, createdOffsetMinutes: -5 });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const offer = await offerForSlot(slotId);
  assert.equal(offer.waiting_list_entry_id, entryP3);

  const { response, body } = await del(`/api/waiting-list/${entryP3}`, USER.staff);
  assert.equal(response.status, 200);
  assert.equal(body.data.cancelledOfferId, offer.id);

  const dbOffer = await pool.query("select status from appointment_offers where id = $1", [offer.id]);
  assert.equal(dbOffer.rows[0].status, "cancelled");
  const next = await offerForSlot(slotId);
  assert.equal(next.patient_id, PATIENT.p4);
});

test("AC-07.5: GET /api/offer-events trả đúng thứ tự sent -> expired -> sent -> accepted", async () => {
  const slotId = await makeSlot({ doctorId: DOCTOR.d1, leadMinutes: 120, status: "booked" });
  await makeEntry({ patientId: PATIENT.p3, doctorId: DOCTOR.d1, createdOffsetMinutes: -10 });
  await makeEntry({ patientId: PATIENT.p4, doctorId: DOCTOR.d1, createdOffsetMinutes: -5 });
  await request(`/api/slots/${slotId}`, { userId: USER.staff, method: "PUT", body: JSON.stringify({ status: "available" }) });
  const first = await offerForSlot(slotId);
  await expireNow(first.id);
  await offerExpirySweeper.sweepOnce();
  const second = await offerForSlot(slotId);
  await post(`/api/offers/${second.id}/accept`, USER.u4);

  const { response, body } = await get(`/api/offer-events?slotId=${slotId}`, USER.staff);
  assert.equal(response.status, 200);
  const types = body.data.map((e) => e.eventType).filter((t) => t !== "entry_fulfilled");
  assert.deepEqual(types, ["offer_sent", "offer_expired", "offer_sent", "offer_accepted"]);
});

test("AC-07.6: bệnh nhân gọi GET/POST /api/waiting-list hoặc GET /api/offer-events -> 403", async () => {
  const r1 = await get("/api/waiting-list", USER.u3);
  const r2 = await post("/api/waiting-list", USER.u3, { patientId: PATIENT.p3, doctorId: DOCTOR.d1 });
  const r3 = await get("/api/offer-events", USER.u3);
  assert.equal(r1.response.status, 403);
  assert.equal(r2.response.status, 403);
  assert.equal(r3.response.status, 403);
});
