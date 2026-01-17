const { pool } = require('../db');
(async () => {
  try {
    const [rows] = await pool.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='healthque' AND TABLE_NAME LIKE '%off%'");
    console.log(rows.map(r => r.TABLE_NAME));
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
