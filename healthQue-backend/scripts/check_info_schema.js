const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || 'healthque123',
    database: 'information_schema'
  });
  try {
    const [rows] = await pool.query("SELECT TABLE_SCHEMA, TABLE_NAME, CREATE_TIME FROM TABLES WHERE TABLE_NAME = 'sessions'");
    console.log(rows);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();