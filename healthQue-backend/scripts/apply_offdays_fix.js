const { pool } = require('../db');
const fs = require('fs');
(async () => {
  try {
    const file = __dirname + '/../migrations/016_create_doctor_off_days.sql';
    const sql = fs.readFileSync(file, 'utf8');
    const cleaned = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    console.log('Executing CREATE for doctor_off_days...');
    await pool.query(cleaned);
    console.log('Executed');
    // remove migration record if exists so migrate can re-run if desired
    try { await pool.query("DELETE FROM migrations WHERE name = '016_create_doctor_off_days.sql'"); console.log('Removed migration record so migrate can reapply if needed'); } catch (e) {}
    process.exit(0);
  } catch (e) {
    console.error('apply_offdays_fix error', e);
    process.exit(1);
  }
})();
