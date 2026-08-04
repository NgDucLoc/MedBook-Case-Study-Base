const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://medbook:medbook@localhost:55432/medbook";

const pool = new Pool({ connectionString: DATABASE_URL });

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function waitForDatabase() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Không kết nối được PostgreSQL");
}

function getClient() {
  return pool.connect();
}

module.exports = { pool, query, waitForDatabase, getClient };
