const { pool } = require('../db');
const fs = require('fs');
(async () => {
  try {
    const sql = fs.readFileSync(__dirname + '/../migrations/016_create_doctor_off_days.sql', 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length && !s.startsWith('--'));
    for (const stmt of statements) {
      console.log('Running:', stmt.slice(0,80).replace(/\n/g,' '),'...');
      await pool.query(stmt);
    }
    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error('create_offdays error', e);
    process.exit(1);
  }
})();
