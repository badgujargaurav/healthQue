const { pool } = require('../db');
const USE_MYSQL = !!process.env.USE_MYSQL;

async function createAppointment({ tenantId, patientId, doctorId, scheduledAt, notes }) {
  if (USE_MYSQL) {
    // inspect appointments columns to support multiple schemas
    const [cols] = await pool.query('SHOW COLUMNS FROM appointments').catch(() => [ [] ]);
    const colNames = (cols || []).map(c => c.Field);
    if (colNames.includes('scheduled_at')) {
      const [res] = await pool.query('INSERT INTO appointments (tenant_id, patient_id, doctor_id, scheduled_at, notes) VALUES (?, ?, ?, ?, ?)', [tenantId, patientId, doctorId, scheduledAt, notes || null]);
      return { id: res.insertId, tenant_id: tenantId, patient_id: patientId, doctor_id: doctorId, scheduled_at: scheduledAt, notes };
    }
    // fallback: separate date/time fields
    if (colNames.includes('appointment_date') && colNames.includes('appointment_time')) {
      const d = scheduledAt ? new Date(scheduledAt) : new Date();
      const dateStr = d.toISOString().slice(0,10); // YYYY-MM-DD
      const timeStr = d.toTimeString().split(' ')[0]; // HH:MM:SS
      const [res] = await pool.query('INSERT INTO appointments (tenant_id, patient_id, doctor_id, appointment_date, appointment_time, notes) VALUES (?, ?, ?, ?, ?, ?)', [tenantId, patientId, doctorId, dateStr, timeStr, notes || null]);
      return { id: res.insertId, tenant_id: tenantId, patient_id: patientId, doctor_id: doctorId, appointment_date: dateStr, appointment_time: timeStr, notes };
    }
    // last resort: try generic insert with available columns
    const insertCols = [];
    const params = [];
    if (colNames.includes('tenant_id')) { insertCols.push('tenant_id'); params.push(tenantId); }
    if (colNames.includes('patient_id')) { insertCols.push('patient_id'); params.push(patientId); }
    if (colNames.includes('doctor_id')) { insertCols.push('doctor_id'); params.push(doctorId); }
    if (colNames.includes('notes')) { insertCols.push('notes'); params.push(notes || null); }
    if (!insertCols.length) throw new Error('appointments table has no known insertable columns');
    const placeholders = insertCols.map(() => '?').join(',');
    const sql = `INSERT INTO appointments (${insertCols.join(',')}) VALUES (${placeholders})`;
    const [res] = await pool.query(sql, params);
    return { id: res.insertId };
  }
  throw new Error('createAppointment requires MySQL');
}

async function getAppointmentById(id) {
  if (USE_MYSQL) {
    const [rows] = await pool.query('SELECT * FROM appointments WHERE id = ? AND (is_deleted IS NULL OR is_deleted = 0) LIMIT 1', [id]);
    return rows[0] || null;
  }
  return null;
}

async function listAppointments({ tenantId, doctorId, patientId, page = 1, limit = 50 }) {
  if (USE_MYSQL) {
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let where = 'WHERE tenant_id = ?';
    if (doctorId) { where += ' AND doctor_id = ?'; params.push(doctorId); }
    if (patientId) { where += ' AND patient_id = ?'; params.push(patientId); }
    const notDeleted = ' AND (is_deleted IS NULL OR is_deleted = 0)';
    const [countRows] = await pool.query(`SELECT COUNT(*) as cnt FROM appointments ${where}${notDeleted}`, params);
    const total = countRows[0]?.cnt || 0;
    params.push(Number(limit), Number(offset));
    // some schemas use appointment_date + appointment_time instead of scheduled_at
    let rows;
    try {
      const q = `SELECT *, CONCAT(appointment_date, ' ', appointment_time) as scheduled_at FROM appointments ${where}${notDeleted} ORDER BY appointment_date DESC, appointment_time DESC LIMIT ? OFFSET ?`;
      const [r] = await pool.query(q, params);
      rows = r;
    } catch (e) {
      // fallback to scheduled_at naming
      const [r] = await pool.query(`SELECT * FROM appointments ${where}${notDeleted} ORDER BY scheduled_at DESC LIMIT ? OFFSET ?`, params);
      rows = r;
    }
    return { data: rows, total };
  }
  return { data: [], total: 0 };
}

async function updateAppointmentStatus(id, status) {
  if (USE_MYSQL) {
    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    return await getAppointmentById(id);
  }
  throw new Error('updateAppointmentStatus requires MySQL');
}

async function updateAppointmentById(id, fields) {
  if (USE_MYSQL) {
    const sets = [];
    const params = [];
    if (fields.scheduled_at !== undefined) { sets.push('scheduled_at = ?'); params.push(fields.scheduled_at); }
    if (fields.doctor_id !== undefined) { sets.push('doctor_id = ?'); params.push(fields.doctor_id); }
    if (fields.patient_id !== undefined) { sets.push('patient_id = ?'); params.push(fields.patient_id); }
    if (fields.is_deleted !== undefined) { sets.push('is_deleted = ?'); params.push(Number(fields.is_deleted)); }
    if (!sets.length) return await getAppointmentById(id);
    params.push(id);
    await pool.query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, params);
    return await getAppointmentById(id);
  }
  throw new Error('updateAppointmentById requires MySQL');
}

module.exports = { createAppointment, getAppointmentById, listAppointments, updateAppointmentStatus, updateAppointmentById };
