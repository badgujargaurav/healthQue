const { pool } = require('../db');
(async () => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS doctor_off_days_test(id INT PRIMARY KEY AUTO_INCREMENT)');
    console.log('created test');
    const [r] = await pool.query("SHOW TABLES LIKE 'doctor_off_days_test'");
    console.log(r.length ? 'FOUND' : 'MISSING');
    process.exit(0);
  } catch (e) {
    console.error('err', e);
    process.exit(1);
  }
})();
