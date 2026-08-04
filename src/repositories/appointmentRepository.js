const { query } = require("../db/pool");

function appointmentSelect(where = "") {
  return `
    select
      a.id,
      a.patient_id as "patientId",
      p.name as "patientName",
      p.phone as "patientPhone",
      a.slot_id as "slotId",
      a.status,
      a.type,
      to_char(a.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt",
      s.doctor_id as "doctorId",
      d.name as "doctorName",
      sp.name as specialization,
      d.room,
      to_char(s.date, 'YYYY-MM-DD') as date,
      to_char(s.start_time, 'HH24:MI') as "startTime",
      to_char(s.end_time, 'HH24:MI') as "endTime"
    from appointments a
    join patients p on p.id = a.patient_id
    join slots s on s.id = a.slot_id
    join doctors d on d.id = s.doctor_id
    join specializations sp on sp.id = d.specialization_id
    ${where}
    order by s.date desc, s.start_time desc
  `;
}

async function findDetailedById(id) {
  const rows = await query(appointmentSelect("where a.id = $1"), [id]);
  return rows[0] || null;
}

async function listByPatient(patientId) {
  return query(appointmentSelect("where a.patient_id = $1"), [patientId]);
}

async function listForStaff({ date }) {
  const params = [];
  const filters = [];
  if (date) {
    params.push(date);
    filters.push(`s.date = $${params.length}`);
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  return query(appointmentSelect(where), params);
}

async function create(client, { patientId, slotId, type }) {
  const result = await client.query(
    `insert into appointments (patient_id, slot_id, status, type)
     values ($1, $2, 'booked', $3)
     returning id`,
    [patientId, slotId, type],
  );
  return result.rows[0];
}

async function findForUpdate(client, id) {
  const result = await client.query(
    "select id, patient_id, slot_id, status from appointments where id = $1 for update",
    [id],
  );
  return result.rows[0] || null;
}

async function updateStatus(client, id, status) {
  await client.query("update appointments set status = $2 where id = $1", [id, status]);
}

async function countActiveBySlot(slotId) {
  const rows = await query(
    `select count(*)::int as count from appointments
     where slot_id = $1 and status in ('booked', 'confirmed')`,
    [slotId],
  );
  return rows[0].count;
}

async function confirmBooked(id) {
  const rows = await query(
    "update appointments set status = 'confirmed' where id = $1 and status = 'booked' returning id",
    [id],
  );
  return rows[0] || null;
}

module.exports = {
  appointmentSelect,
  findDetailedById,
  listByPatient,
  listForStaff,
  create,
  findForUpdate,
  updateStatus,
  countActiveBySlot,
  confirmBooked,
};
