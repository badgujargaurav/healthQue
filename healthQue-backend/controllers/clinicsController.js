const { pool } = require('../db');
const { validationResult } = require('express-validator');

exports.listClinics = async (req, res) => {
  const userPayload = req.user;
  if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userPayload.userId;
  const doctorId = userPayload.doctorId;
  try {
    // Inspect clinics table columns to decide a safe query
    let rows = [];
    let hasDoctorId = false;
    let hasUserId = false;
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM clinics");
      const names = (cols || []).map(c => c.Field);
      hasDoctorId = names.includes('doctor_id');
      hasUserId = names.includes('user_id');
    } catch (colsErr) {
      // if SHOW COLUMNS fails, continue with defaults
      console.warn('could not inspect clinics columns', colsErr && colsErr.code ? colsErr.code : colsErr);
    }

    // Preferred: if doctorId present in payload and clinics has doctor_id, use it
    if (doctorId && hasDoctorId) {
      [rows] = await pool.query('SELECT * FROM clinics WHERE doctor_id = ?', [doctorId]);
      return res.json({ data: rows });
    }

    // If both columns exist, query for either match
    if (hasDoctorId && hasUserId) {
      [rows] = await pool.query('SELECT * FROM clinics WHERE doctor_id = ? OR user_id = ?', [doctorId || null, userId]);
      return res.json({ data: rows });
    }

    // If only user_id exists
    if (hasUserId) {
      [rows] = await pool.query('SELECT * FROM clinics WHERE user_id = ?', [userId]);
      return res.json({ data: rows });
    }

    // If only doctor_id exists (but doctorId not provided), try to resolve doctorId from users->doctors
    if (hasDoctorId && !doctorId) {
      try {
        const [drows] = await pool.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
        if (drows && drows.length) {
          const did = drows[0].id;
          [rows] = await pool.query('SELECT * FROM clinics WHERE doctor_id = ?', [did]);
          return res.json({ data: rows });
        }
      } catch (e) {
        // ignore and fallthrough
      }
    }

    // Fallbacks: if tenantId available, scope by tenant_id
    if (userPayload.tenantId) {
      try {
        [rows] = await pool.query('SELECT * FROM clinics WHERE tenant_id = ?', [userPayload.tenantId]);
        return res.json({ data: rows });
      } catch (e) {
        // ignore and fallback to limited list
      }
    }

    // Last resort: return a limited list
    [rows] = await pool.query('SELECT * FROM clinics LIMIT 100');
    return res.json({ data: rows });
  } catch (e) {
    console.error('listClinics error', e);
    return res.status(500).json({ error: 'Failed to list clinics' });
  }
};

exports.getClinic = async (req, res) => {
  const userPayload = req.user;
  if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userPayload.userId;
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM clinics WHERE id = ? LIMIT 1', [id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Clinic not found' });
    const clinic = rows[0];
    const doctorId = userPayload.doctorId;
    if (clinic.doctor_id && doctorId && clinic.doctor_id !== doctorId) return res.status(403).json({ error: 'Forbidden' });
    if (clinic.user_id && clinic.user_id !== userId && !doctorId) return res.status(403).json({ error: 'Forbidden' });
    return res.json(clinic);
  } catch (e) {
    console.error('getClinic error', e);
    return res.status(500).json({ error: 'Failed to get clinic' });
  }
};

exports.updateClinic = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userPayload = req.user;
  if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userPayload.userId;
  const doctorId = userPayload.doctorId;
  const id = req.params.id;
  const { name, location, address, description, schedule } = req.body || {};
  try {
    const [rows] = await pool.query('SELECT * FROM clinics WHERE id = ? LIMIT 1', [id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Clinic not found' });
    const clinic = rows[0];
    if (clinic.doctor_id && doctorId && clinic.doctor_id !== doctorId) return res.status(403).json({ error: 'Forbidden' });
    if (clinic.user_id && clinic.user_id !== userId && !doctorId) return res.status(403).json({ error: 'Forbidden' });
    const sets = [];
    const params = [];
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    // support either `address` or `location` column in clinics
    if (address !== undefined) {
      if (Object.prototype.hasOwnProperty.call(clinic, 'address')) { sets.push('address = ?'); params.push(address); }
      else if (Object.prototype.hasOwnProperty.call(clinic, 'location')) { sets.push('location = ?'); params.push(address); }
    } else if (location !== undefined) {
      if (Object.prototype.hasOwnProperty.call(clinic, 'location')) { sets.push('location = ?'); params.push(location); }
      else if (Object.prototype.hasOwnProperty.call(clinic, 'address')) { sets.push('address = ?'); params.push(location); }
    }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (schedule !== undefined) { sets.push('schedule = ?'); params.push(typeof schedule === 'string' ? schedule : JSON.stringify(schedule)); }
    if (sets.length) {
      params.push(id);
      await pool.query(`UPDATE clinics SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    const [fresh] = await pool.query('SELECT * FROM clinics WHERE id = ? LIMIT 1', [id]);
    return res.json(fresh[0]);
  } catch (e) {
    console.error('updateClinic error', e);
    return res.status(500).json({ error: 'Failed to update clinic' });
  }
};

module.exports = exports;
