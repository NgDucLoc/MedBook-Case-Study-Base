const { query } = require("../db/pool");

async function listSpecializations() {
  return query("select id, name from specializations order by name");
}

async function searchDoctors({ specializationId, q }) {
  const params = [];
  const filters = [];
  if (specializationId) {
    params.push(specializationId);
    filters.push(`d.specialization_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    filters.push(`d.name ilike $${params.length}`);
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  return query(
    `
      select d.id, d.name, d.title, d.room, sp.id as "specializationId", sp.name as specialization,
        count(s.id) filter (where s.status = 'available' and s.date >= current_date) as "availableSlots"
      from doctors d
      join specializations sp on sp.id = d.specialization_id
      left join slots s on s.doctor_id = d.id
      ${where}
      group by d.id, sp.id
      order by sp.name, d.name
    `,
    params,
  );
}

async function findById(id) {
  const rows = await query("select id, name, title, room from doctors where id = $1", [id]);
  return rows[0] || null;
}

module.exports = { listSpecializations, searchDoctors, findById };
