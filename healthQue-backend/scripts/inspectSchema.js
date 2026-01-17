const { pool } = require('../db');

async function cols(table) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${table}`);
    return rows.map(r => r.Field);
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  const tables = ['users','doctors','patients','appointments','tenants'];
  for (const t of tables) {
    const res = await cols(t);
    console.log('TABLE', t, Array.isArray(res) ? res.join(', ') : res.error);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(2); });
