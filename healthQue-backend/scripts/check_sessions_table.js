const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || 'healthque123',
    database: process.env.MYSQL_DB || 'healthque'
  });
  try {
    const [rows] = await pool.query("SHOW TABLES LIKE 'sessions'");
    console.log('tables:', rows);
  } catch (e) {
    console.error('error checking tables', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();