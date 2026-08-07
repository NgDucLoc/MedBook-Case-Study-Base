const { query, pool } = require("../db/pool");

// BR-05: expires_at = min(now() + timeout, giờ bắt đầu slot). Tính ngay trong INSERT để
// không phải đọc slot riêng (slotRepository.findForUpdate chỉ trả id/status — KHÔNG SỬA).
async function create(client, { waitingListEntryId, patientId, slotId, appointmentType, timeoutMinutes }) {
  const runner = client || pool;
  const result = await runner.query(
    `insert into appointment_offers
       (waiting_list_entry_id, patient_id, slot_id, appointment_type, status, expires_at)
     select $1, $2, $3, $4, 'sent',
       least(now() + ($5 || ' minutes')::interval, (s.date + s.start_time)::timestamptz)
     from slots s where s.id = $3
     returning *`,
    [waitingListEntryId, patientId, slotId, appointmentType, timeoutMinutes],
  );
  return result.rows[0];
}

async function findById(id) {
  const rows = await query("select * from appointment_offers where id = $1", [id]);
  return rows[0] || null;
}

async function findByIdForUpdate(client, id) {
  const result = await client.query(
    "select * from appointment_offers where id = $1 for update",
    [id],
  );
  return result.rows[0] || null;
}

async function findPendingByWaitingListEntry(waitingListEntryId) {
  const rows = await query(
    "select * from appointment_offers where waiting_list_entry_id = $1 and status = 'sent'",
    [waitingListEntryId],
  );
  return rows[0] || null;
}

async function findPendingBySlot(slotId) {
  const rows = await query(
    "select * from appointment_offers where slot_id = $1 and status = 'sent'",
    [slotId],
  );
  return rows[0] || null;
}

// doc/specs/04-data-model.md §4.4 — mẫu chung cho declined / expired / cancelled.
// KHÔNG dùng mẫu này cho 'accepted' (thiếu appointment_id sẽ vi phạm CHECK constraint).
async function transitionIfSent(client, id, status, { cancelReason, declineReason } = {}) {
  const runner = client || pool;
  const result = await runner.query(
    `update appointment_offers
     set status = $2, responded_at = now(), updated_at = now(),
         cancel_reason = coalesce($3, cancel_reason),
         decline_reason = coalesce($4, decline_reason)
     where id = $1 and status = 'sent'
     returning *`,
    [id, status, cancelReason || null, declineReason || null],
  );
  return result.rows[0] || null;
}

// §4.4 — mẫu riêng cho 'accepted': appointment_id trong CÙNG câu lệnh + and expires_at > now().
async function acceptIfSentAndNotExpired(client, id, appointmentId) {
  const result = await client.query(
    `update appointment_offers
     set status = 'accepted', appointment_id = $2, responded_at = now(), updated_at = now()
     where id = $1 and status = 'sent' and expires_at > now()
     returning *`,
    [id, appointmentId],
  );
  return result.rows[0] || null;
}

// Phục vụ sweeper (BR-05/BR-06, AC-06.1).
async function findExpired() {
  return query(
    `select * from appointment_offers
     where status = 'sent' and expires_at <= now()
     order by expires_at asc`,
  );
}

// BR-08: KHÔNG SELECT * cho endpoint của bệnh nhân — liệt kê cột tường minh, không lộ
// medicalPriority/note/thông tin bệnh nhân khác.
function myOffersSelect(where) {
  return `
    select
      o.id,
      o.slot_id as "slotId",
      d.name as "doctorName",
      d.title as "doctorTitle",
      sp.name as specialization,
      d.room,
      to_char(s.date, 'YYYY-MM-DD') as date,
      to_char(s.start_time, 'HH24:MI') as "startTime",
      to_char(s.end_time, 'HH24:MI') as "endTime",
      o.appointment_type as "appointmentType",
      o.status,
      to_char(o.expires_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as "expiresAt",
      greatest(0, floor(extract(epoch from (o.expires_at - now()))))::int as "remainingSeconds"
    from appointment_offers o
    join slots s on s.id = o.slot_id
    join doctors d on d.id = s.doctor_id
    join specializations sp on sp.id = d.specialization_id
    ${where}
  `;
}

async function listMyOffers(patientId, { includeHistory } = {}) {
  const statusFilter = includeHistory
    ? "(o.status = 'sent' or (o.status != 'sent' and o.responded_at >= now() - interval '7 days'))"
    : "o.status = 'sent'";
  return query(
    myOffersSelect(`where o.patient_id = $1 and ${statusFilter}`) + " order by o.sent_at desc",
    [patientId],
  );
}

function staffOffersSelect(where) {
  return `
    select
      o.id,
      o.waiting_list_entry_id as "waitingListEntryId",
      o.patient_id as "patientId",
      p.name as "patientName",
      p.phone as "patientPhone",
      o.slot_id as "slotId",
      d.name as "doctorName",
      sp.name as specialization,
      d.room,
      to_char(s.date, 'YYYY-MM-DD') as date,
      to_char(s.start_time, 'HH24:MI') as "startTime",
      to_char(s.end_time, 'HH24:MI') as "endTime",
      o.appointment_type as "appointmentType",
      o.status,
      to_char(o.sent_at, 'YYYY-MM-DD HH24:MI') as "sentAt",
      to_char(o.expires_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as "expiresAt",
      to_char(o.responded_at, 'YYYY-MM-DD HH24:MI') as "respondedAt",
      o.cancel_reason as "cancelReason",
      o.decline_reason as "declineReason"
    from appointment_offers o
    join patients p on p.id = o.patient_id
    join slots s on s.id = o.slot_id
    join doctors d on d.id = s.doctor_id
    join specializations sp on sp.id = d.specialization_id
    ${where}
  `;
}

async function listForStaff({ slotId, patientId, status } = {}) {
  const params = [];
  const filters = [];
  if (slotId) {
    params.push(slotId);
    filters.push(`o.slot_id = $${params.length}`);
  }
  if (patientId) {
    params.push(patientId);
    filters.push(`o.patient_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    filters.push(`o.status = $${params.length}`);
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  return query(staffOffersSelect(where) + " order by o.sent_at desc", params);
}

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  findPendingByWaitingListEntry,
  findPendingBySlot,
  transitionIfSent,
  acceptIfSentAndNotExpired,
  findExpired,
  listMyOffers,
  listForStaff,
};
