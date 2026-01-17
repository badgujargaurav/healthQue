const { pool } = require('../db');

(async () => {
  try {
    const need = [
      ['profile_completed', 'TINYINT(1) DEFAULT 0']
    ];
    for (const [col, def] of need) {
      const [rows] = await pool.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [process.env.MYSQL_DB || 'healthque', 'doctors', col]
      );
      if (!rows || rows.length === 0) {
        console.log('Adding', col);
        await pool.query(`ALTER TABLE doctors ADD COLUMN ${col} ${def}`);
      } else {
        console.log('Exists', col);
      }
    }
    console.log('Done');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Error', e);
    process.exit(1);
  }
})();
