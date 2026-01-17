const doctorModel = require('../models/doctorModel');
const { validationResult } = require('express-validator');
const { query, body, param } = require('express-validator');
const { pool } = require('../db');

exports.list = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { filter, sortBy = 'id', sortDir = 'asc', page = 1, limit = 100 } = req.query;
  try {
    const result = await doctorModel.listDoctors({ filter, sortBy, sortDir, page: Number(page), limit: Number(limit) });
    res.json({ data: result.data, meta: { total: result.total, page: Number(page), limit: Number(limit) } });
  } catch (e) {
    console.error('doctorController.list error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, specialty, location, phone } = req.body;
  try {
    const doc = await doctorModel.createDoctor({ name, email, specialty, location, phone });
    res.status(201).json({ data: doc });
  } catch (e) {
    console.error('doctorController.create error', e);
    res.status(400).json({ error: e.message || 'Unable to create doctor' });
  }
};

// Admin creates a doctor on behalf of a tenant
exports.createByAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, specialty, location, phone } = req.body;
  
  // Always create a new tenant for this doctor when admin creates it
  const tenantId = null;
  try {
    const doc = await doctorModel.createDoctorAdmin({ tenantId, name, email, password, specialty, location, phone });
    res.status(201).json({ data: doc });
  } catch (e) {
    console.error('doctorController.createByAdmin error', e);
    res.status(400).json({ error: e.message || 'Unable to create doctor' });
  }
};

exports.getById = async (req, res) => {
  const id = req.params.id;
  try {
    const doc = await doctorModel.getDoctorById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('doctorController.getById error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.setActive = async (req, res) => {
  const id = req.params.id;
  const { active } = req.body;
  try {
    if (!/[01]/.test(String(active))) return res.status(400).json({ error: 'Invalid active value' });
    await doctorModel.setUserActiveByDoctorId(id, Number(active));
    res.json({ success: true });
  } catch (e) {
    console.error('setActive error', e);
    res.status(500).json({ error: 'Internal' });
  }
};

exports.setTrial = async (req, res) => {
  const id = req.params.id;
  const { trial_expires_at } = req.body;
  try {
    await doctorModel.setTrialByDoctorId(id, trial_expires_at || null);
    res.json({ success: true });
  } catch (e) {
    console.error('setTrial error', e);
    res.status(500).json({ error: 'Internal' });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const ok = await doctorModel.deleteDoctor(id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) {
    console.error('doctorController.delete error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getOffDays = async (req, res) => {
  const id = req.params.id;
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // allow admin, or allow doctor if they own the doctor record
    if (user.role !== 'admin') {
      if (user.role === 'doctor') {
        // try to resolve doctor's id from users table
        let ownDoctorId = null;
        try {
          if (pool) {
            const [rows] = await pool.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [user.userId || user.userId]);
            if (rows && rows.length) ownDoctorId = rows[0].id;
          }
        } catch (e) {
          // ignore resolution error
        }
        if (!ownDoctorId || String(ownDoctorId) !== String(id)) return res.status(403).json({ error: 'Forbidden' });
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const { from, to, type } = req.query || {};
    const rows = await doctorModel.listOffDays(id, { from, to, type });
    res.json({ data: rows || [] });
  } catch (e) {
    console.error('getOffDays error', e);
    res.status(500).json({ error: 'Failed to load off days' });
  }
};

exports.addOffDay = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = req.params.id;
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    if (user.role !== 'admin') {
      if (user.role === 'doctor') {
        let ownDoctorId = null;
        try {
          if (pool) {
            const [rows] = await pool.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [user.userId]);
            if (rows && rows.length) ownDoctorId = rows[0].id;
          }
        } catch (e) {}
        if (!ownDoctorId || String(ownDoctorId) !== String(id)) return res.status(403).json({ error: 'Forbidden' });
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const payload = {
      doctorId: Number(id),
      start_date: req.body.start_date,
      end_date: req.body.end_date || null,
      is_recurring_weekly: req.body.is_recurring_weekly ? 1 : 0,
      day_of_week: req.body.day_of_week != null ? Number(req.body.day_of_week) : null,
      type: req.body.type || 'scheduled',
      reason: req.body.reason || null,
      status: req.body.status || 'off'
    };
    const created = await doctorModel.createOffDay(payload);
    res.status(201).json({ data: created });
  } catch (e) {
    console.error('addOffDay error', e);
    res.status(500).json({ error: 'Failed to add off day' });
  }
};

exports.deleteOffDay = async (req, res) => {
  const id = req.params.id;
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const od = await doctorModel.getOffDayById(id);
    if (!od) return res.status(404).json({ error: 'Not found' });
    if (user.role !== 'admin' && String(user.doctorId) !== String(od.doctor_id)) return res.status(403).json({ error: 'Forbidden' });
    // Mark as working (soft unset) instead of physical delete
    const ok = await doctorModel.deleteOffDay(id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('deleteOffDay error', e);
    res.status(500).json({ error: 'Failed to delete off day' });
  }
};

exports.toggleOffDayStatus = async (req, res) => {
  const id = req.params.id;
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const od = await doctorModel.getOffDayById(id);
    if (!od) return res.status(404).json({ error: 'Not found' });
    if (user.role !== 'admin') {
      if (user.role === 'doctor') {
        // allow if token already contains owning doctor id in various possible fields
        const poss = [user.doctorId, user.doctor_id, user.userId, user.user_id, user.id];
        if (poss.some(x => x !== undefined && String(x) === String(od.doctor_id))) {
          // authorized
        } else {
          // try to resolve doctor's id from users table (some auth tokens set user.userId)
          let ownDoctorId = null;
          try {
            if (pool) {
              const lookupId = user.userId || user.user_id || user.id;
              if (lookupId) {
                const [rows] = await pool.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [lookupId]);
                if (rows && rows.length) ownDoctorId = rows[0].id;
              }
            }
          } catch (e) {
            // ignore
          }
          if (!ownDoctorId || String(ownDoctorId) !== String(od.doctor_id)) return res.status(403).json({ error: 'Forbidden' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const wanted = (req.body && req.body.status) ? String(req.body.status) : (od.status === 'off' ? 'working' : 'off');
    if (!['off','working'].includes(wanted)) return res.status(400).json({ error: 'Invalid status' });
    const updated = await doctorModel.updateOffDayStatus(id, wanted);
    if (!updated) return res.status(500).json({ error: 'Failed to update status' });
    res.json({ data: updated });
  } catch (e) {
    console.error('toggleOffDayStatus error', e);
    res.status(500).json({ error: 'Failed to update off day status' });
  }
};

// Set or unset off-day by date for a doctor. Body: { date: 'YYYY-MM-DD', action: 'set'|'unset', type?, reason? }
exports.setOffDayByDate = async (req, res) => {
  const id = req.params.id;
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // authorization: admin or doctor owning the record
    if (user.role !== 'admin') {
      if (user.role === 'doctor') {
        let ownDoctorId = null;
        try {
          if (pool) {
            const [rows] = await pool.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [user.userId]);
            if (rows && rows.length) ownDoctorId = rows[0].id;
          }
        } catch (e) {}
        if (!ownDoctorId || String(ownDoctorId) !== String(id)) return res.status(403).json({ error: 'Forbidden' });
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { date, action = 'set', type = 'scheduled', reason = null } = req.body || {};
    if (!date) return res.status(400).json({ error: 'Missing date' });
    const doctorId = Number(id);

    if (action === 'set') {
      const created = await doctorModel.createOffDay({ doctorId, start_date: date, end_date: date, is_recurring_weekly: 0, day_of_week: null, type, reason, status: 'off' });
      return res.status(201).json({ data: created });
    }

    // action === 'unset'
    // find any off-day rows for this doctor that overlap the date (including recurring weekly)
    const rows = await doctorModel.listOffDays(doctorId, { from: date, to: date });
    const results = [];
    for (const r of rows || []) {
      if (r.is_recurring_weekly) {
        // create a one-day override marking working on this specific date
        const override = await doctorModel.createOffDay({ doctorId, start_date: date, end_date: date, is_recurring_weekly: 0, day_of_week: null, type: r.type || 'scheduled', reason: reason || `Override unset for ${date}`, status: 'working' });
        results.push(override);
      } else {
        // non-recurring: mark the existing row as working
        const updated = await doctorModel.updateOffDayStatus(r.id, 'working');
        results.push(updated);
      }
    }
    return res.json({ data: results });
  } catch (e) {
    console.error('setOffDayByDate error', e);
    res.status(500).json({ error: 'Failed to set/unset off day' });
  }
};
