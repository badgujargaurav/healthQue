const { pool } = require('../db');
const USE_MYSQL = !!process.env.USE_MYSQL;

async function createPatient({ tenantId, name, dob, contact, medical_history }) {
  if (USE_MYSQL) {
    const [res] = await pool.query('INSERT INTO patients (tenant_id, name, dob, contact, medical_history) VALUES (?, ?, ?, ?, ?)', [tenantId, name, dob || null, contact ? JSON.stringify(contact) : null, medical_history ? JSON.stringify(medical_history) : null]);
    return { id: res.insertId, tenant_id: tenantId, name, dob, contact, medical_history };
  }
  throw new Error('createPatient requires MySQL in production');
}

async function getPatientById(id) {
  if (USE_MYSQL) {
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return null;
    const p = rows[0];
    return { ...p, contact: p.contact ? JSON.parse(p.contact) : null, medical_history: p.medical_history ? JSON.parse(p.medical_history) : null };
  }
  return null;
}

async function listPatients({ tenantId, filter, page = 1, limit = 50 }) {
  if (USE_MYSQL) {
    try {
      const offset = (page - 1) * limit;
      const params = [tenantId];
      let where = 'WHERE tenant_id = ?';
      if (filter) {
        where += ' AND name LIKE ?';
        params.push(`%${filter}%`);
      }
      // total count
      const [countRows] = await pool.query(`SELECT COUNT(*) as cnt FROM patients ${where}`, params);
      const total = countRows[0]?.cnt || 0;
      params.push(Number(limit), Number(offset));
      const [rows] = await pool.query(`SELECT id,tenant_id,name,dob,contact,medical_history,created_at FROM patients ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, params);
      const data = rows.map(p => ({ ...p, contact: p.contact ? JSON.parse(p.contact) : null, medical_history: p.medical_history ? JSON.parse(p.medical_history) : null }));
      return { data, total };
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        return { data: [], total: 0 };
      }
      throw e;
    }
  }
  return { data: [], total: 0 };
}

async function updatePatientById(id, fields) {
  if (USE_MYSQL) {
    const sets = [];
    const params = [];
    if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
    if (fields.dob !== undefined) { sets.push('dob = ?'); params.push(fields.dob); }
    if (fields.contact !== undefined) { sets.push('contact = ?'); params.push(JSON.stringify(fields.contact)); }
    if (fields.medical_history !== undefined) { sets.push('medical_history = ?'); params.push(JSON.stringify(fields.medical_history)); }
    if (!sets.length) return await getPatientById(id);
    params.push(id);
    await pool.query(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`, params);
    return await getPatientById(id);
  }
  throw new Error('updatePatientById requires MySQL');
}

module.exports = { createPatient, getPatientById, listPatients, updatePatientById };
