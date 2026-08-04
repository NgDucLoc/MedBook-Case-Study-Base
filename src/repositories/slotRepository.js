const { query } = require("../db/pool");

function slotSelect(where = "") {
  return `
    select
      s.id,
      s.doctor_id as "doctorId",
      d.name as "doctorName",
      d.title,
      d.room,
      sp.id as "specializationId",
      sp.name as specialization,
      to_char(s.date, 'YYYY-MM-DD') as date,
      to_char(s.start_time, 'HH24:MI') as "startTime",
      to_char(s.end_time, 'HH24:MI') as "endTime",
      s.status
    from slots s
    join doctors d on d.id = s.doctor_id
    join specializations sp on sp.id = d.specialization_id
    ${where}
    order by s.date, s.start_time, d.name
  `;
}

async function listAvailable() {
  return query(slotSelect("where s.status = 'available' and s.date >= current_date"));
}

async function listAllUpcoming({ date } = {}) {
  const params = [];
  let where = "where s.date >= current_date";
  if (date) {
    params.push(date);
    where += ` and s.date = $${params.length}`;
  }
  return query(slotSelect(where), params);
}

async function listAvailableByDoctor(doctorId, date) {
  const params = [doctorId];
  let where = "where s.doctor_id = $1 and s.status = 'available' and s.date >= current_date";
  if (date) {
    params.push(date);
    where += ` and s.date = $${params.length}`;
  }
  return query(slotSelect(where), params);
}

async function createSlot({ doctorId, date, startTime, endTime, status = "available" }) {
  const rows = await query(
    `insert into slots (doctor_id, date, start_time, end_time, status)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [doctorId, date, startTime, endTime, status],
  );
  return findDetailedById(rows[0].id);
}

async function findDetailedById(id) {
  const rows = await query(slotSelect("where s.id = $1"), [id]);
  return rows[0] || null;
}

async function findForUpdate(client, slotId) {
  const result = await client.query(
    "select id, status from slots where id = $1 for update",
    [slotId],
  );
  return result.rows[0] || null;
}

async function updateStatus(client, slotId, status) {
  await client.query("update slots set status = $2 where id = $1", [slotId, status]);
}

async function updateSlot({ id, startTime, endTime, status }) {
  const rows = await query(
    `update slots
     set
       start_time = coalesce($2, start_time),
       end_time = coalesce($3, end_time),
       status = coalesce($4, status)
     where id = $1
     returning id`,
    [id, startTime || null, endTime || null, status || null],
  );
  return rows[0] ? findDetailedById(rows[0].id) : null;
}

module.exports = {
  slotSelect,
  listAvailable,
  listAllUpcoming,
  listAvailableByDoctor,
  createSlot,
  findDetailedById,
  findForUpdate,
  updateStatus,
  updateSlot,
};
