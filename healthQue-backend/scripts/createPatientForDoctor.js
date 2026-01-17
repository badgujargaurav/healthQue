// Create a patient user and patient record linked to a doctor
// Usage: node scripts/createPatientForDoctor.js --doctorId=1 --email=patient@hq.com --password=1234567

const bcrypt = require('bcrypt');
const { pool } = require('../db');
// simple argv parsing to avoid extra deps
const rawArgs = process.argv.slice(2);
const argv = rawArgs.reduce((acc, cur) => {
  if (cur.startsWith('--')) {
    const [k, v] = cur.slice(2).split('='); acc[k] = v === undefined ? true : v; return acc;
  }
  if (cur.includes('=')) {
    const [k, v] = cur.split('='); acc[k] = v; return acc;
  }
  return acc;
}, {});

async function main() {
  const doctorId = Number(argv.doctorId || argv.d || 1);
  const email = argv.email || 'patient@hq.com';
  const password = argv.password || '1234567';
  const name = argv.name || 'Patient User';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // find doctor
    const [drRows] = await conn.query('SELECT id, tenant_id, user_id FROM doctors WHERE id = ? LIMIT 1', [doctorId]);
    if (!drRows || !drRows[0]) throw new Error('Doctor not found: ' + doctorId);
    const tenantId = drRows[0].tenant_id;

    // ensure users table doesn't already have this email
    const [exists] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]).catch(() => [ [] ]);
    if (exists && exists[0]) {
      console.log('User with this email already exists, id=', exists[0].id);
      await conn.commit();
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    // insert into users. detect columns
    const [cols] = await conn.query('SHOW COLUMNS FROM users');
    const colNames = (cols || []).map(c => c.Field);
    const insertCols = [];
    const insertVals = [];
    if (colNames.includes('tenant_id')) { insertCols.push('tenant_id'); insertVals.push(tenantId); }
    if (colNames.includes('role')) { insertCols.push('role'); insertVals.push('patient'); }
    if (colNames.includes('full_name')) { insertCols.push('full_name'); insertVals.push(name); }
    else if (colNames.includes('name')) { insertCols.push('name'); insertVals.push(name); }
    if (colNames.includes('email')) { insertCols.push('email'); insertVals.push(email); }
    if (colNames.includes('password_hash')) { insertCols.push('password_hash'); insertVals.push(hash); }
    else if (colNames.includes('password')) { insertCols.push('password'); insertVals.push(hash); }

    if (insertCols.length === 0) throw new Error('No compatible columns found in users table');

    const placeholders = insertCols.map(() => '?').join(',');
    const sql = `INSERT INTO users (${insertCols.join(',')}) VALUES (${placeholders})`;
    const [uRes] = await conn.query(sql, insertVals);
    const userId = uRes.insertId;
    console.log('Inserted user id', userId);

    // ensure patients table exists (create if missing)
    const [pCheck] = await conn.query("SHOW TABLES LIKE 'patients'");
    if (!pCheck || !pCheck[0]) {
      console.log('Creating patients table');
      await conn.query(`CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NULL,
        name VARCHAR(255) NOT NULL,
        dob DATE NULL,
        contact JSON NULL,
        medical_history JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    // insert into patients
    const [pRes] = await conn.query('INSERT INTO patients (tenant_id, user_id, name) VALUES (?, ?, ?)', [tenantId, userId, name]);
    console.log('Inserted patient id', pRes.insertId);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    console.error('Failed to create patient', e);
    process.exit(2);
  } finally {
    conn.release();
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(2); });
