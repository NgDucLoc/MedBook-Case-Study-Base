const { query } = require("../db/pool");

const publicUserColumns = `id, name, email, role, patient_id as "patientId"`;

async function listDemoUsers() {
  return query(`select ${publicUserColumns} from users order by role, name`);
}

async function findPublicById(id) {
  const rows = await query(`select ${publicUserColumns} from users where id = $1`, [id]);
  return rows[0] || null;
}

async function findForLoginByEmail(email) {
  const rows = await query(
    `select ${publicUserColumns}, demo_password from users where lower(email) = $1`,
    [email],
  );
  return rows[0] || null;
}

module.exports = {
  listDemoUsers,
  findPublicById,
  findForLoginByEmail,
};
