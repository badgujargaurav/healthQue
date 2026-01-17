const { pool } = require('../db');
(async () => {
  try {
    const [tbls] = await pool.query("SHOW TABLES LIKE 'doctor_off_days'");
    console.log('doctor_off_days table:', tbls.length ? 'FOUND' : 'MISSING');
    const [mrows] = await pool.query('SELECT name FROM migrations');
    console.log('Applied migrations count:', mrows.length);
    mrows.forEach(r => console.log('-', r.name));
    process.exit(0);
  } catch (e) {
    console.error('Error checking tables', e);
    process.exit(1);
  }
})();
