const { pool } = require('../db');
(async () => {
  try {
    const [c] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='clinics'");
    console.log('clinics:', c.map(r => r.COLUMN_NAME).join(', '));
    const [d] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doctors'");
    console.log('doctors:', d.map(r => r.COLUMN_NAME).join(', '));
    const [m] = await pool.query("SELECT name, run_on FROM migrations ORDER BY id");
    console.log('migrations applied:', m.map(r => r.name).join(', '));
    const [k] = await pool.query("SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME='doctors' OR TABLE_NAME='clinics') AND (COLUMN_NAME='clinic_id' OR COLUMN_NAME='doctor_id')");
    console.log('key usages:', (k || []).map(r => ({table: r.TABLE_NAME, column: r.COLUMN_NAME, constraint: r.CONSTRAINT_NAME, referenced_table: r.REFERENCED_TABLE_NAME, referenced_column: r.REFERENCED_COLUMN_NAME}))); 
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
