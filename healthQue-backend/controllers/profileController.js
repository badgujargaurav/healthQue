const userModel = require('../models/userModel');
const doctorModel = require('../models/doctorModel');
const { validationResult } = require('express-validator');
const { pool } = require('../db');

exports.getProfile = async (req, res) => {
  // auth middleware attaches req.user
  const userPayload = req.user;
  if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userPayload.userId;
  // try DB-backed user first
  if (userModel.findById) {
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, password_hash, ...profile } = user;
    // attach doctor row if available (MySQL doctors table)
    if (process.env.USE_MYSQL) {
      try {
        const [rows] = await pool.query('SELECT * FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
        if (rows && rows.length) profile.doctor = rows[0];
      } catch (e) {
        // ignore errors and return user profile only
      }
    }
    // if doctor row exists, attach a clinic owned by this doctor (clinics.doctor_id)
    if (process.env.USE_MYSQL && profile.doctor && profile.doctor.id) {
      try {
        const [crow] = await pool.query('SELECT id,name,address,location,schedule FROM clinics WHERE doctor_id = ? LIMIT 1', [profile.doctor.id]);
        if (crow && crow.length) {
          profile.doctor.clinic = crow[0];
          // keep backward-compatible `clinic_schedule` field for frontend
          if (!profile.doctor.clinic_schedule && crow[0].schedule) profile.doctor.clinic_schedule = crow[0].schedule;
          if (!profile.doctor.clinic_name && crow[0].name) profile.doctor.clinic_name = crow[0].name;
        }
      } catch (e) {
        // ignore
      }
      // also include clinics count for this doctor (safe fallbacks)
      try {
        const [cnt] = await pool.query('SELECT COUNT(*) AS cnt FROM clinics WHERE doctor_id = ?', [profile.doctor.id]);
        const n = (cnt && cnt.length ? cnt[0].cnt : 0) || 0;
        profile.doctor.clinics_count = n;
        profile.clinics_count = n;
      } catch (err) {
        try {
          const [cnt2] = await pool.query('SELECT COUNT(*) AS cnt FROM clinics');
          const n2 = (cnt2 && cnt2.length ? cnt2[0].cnt : 0) || 0;
          profile.clinics_count = n2;
          if (profile.doctor) profile.doctor.clinics_count = n2;
        } catch (_ignore) {}
      }
    }
    return res.json(profile);
  }
  // fallback to in-memory
  const user = userModel.findByEmail(userPayload.email || '');
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...profile } = user;
  res.json(profile);
};

exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userPayload = req.user;
  if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userPayload.userId;
  const { name, phone, website, company, specialty, clinic_address, clinic_name, clinic_location, clinic_schedule, clinic_description } = req.body || {};
  try {
    // If MySQL is enabled, perform a DB transaction to update users + doctors atomically
    if (process.env.USE_MYSQL) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // update users
        const userSets = [];
        const userParams = [];
        if (name !== undefined) { userSets.push('name = ?'); userParams.push(name); }
        if (phone !== undefined) { userSets.push('phone = ?'); userParams.push(phone); }
        if (website !== undefined) { userSets.push('website = ?'); userParams.push(website); }
        if (userSets.length) {
          userParams.push(userId);
          await conn.query(`UPDATE users SET ${userSets.join(', ')} WHERE id = ?`, userParams);
        }
        // update doctors table if fields provided — only update columns that actually exist
        if (specialty !== undefined || clinic_address !== undefined || clinic_location !== undefined || clinic_schedule !== undefined || clinic_name !== undefined) {
          // detect available columns in doctors table
          let available = new Set();
          try {
            const [cols] = await conn.query("SHOW COLUMNS FROM doctors");
            (cols || []).forEach(c => available.add(c.Field));
          } catch (e) {
            // If SHOW COLUMNS fails, fall back to attempting update and catch errors
            available = null;
          }
          // fetch existing doctor row
          let existingDoctor = null;
          try {
            const [drows] = await conn.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
            if (drows && drows.length) existingDoctor = drows[0];
          } catch (e) {
            existingDoctor = null;
          }

          // If a clinic_name was provided and a clinics table exists, create a clinics row and capture its id
          let createdClinicId = null;
          if (clinic_name !== undefined) {
            try {
              const [tbls] = await conn.query("SHOW TABLES LIKE 'clinics'");
              if (tbls && tbls.length) {
                const scheduleVal = clinic_schedule !== undefined ? (typeof clinic_schedule === 'string' ? clinic_schedule : JSON.stringify(clinic_schedule)) : null;
                const locationVal = clinic_location !== undefined ? clinic_location : clinic_address || null;
                // determine doctor id if exists
                const doctorId = existingDoctor ? existingDoctor.id : null;
                // try to update any clinic owned by this doctor (by doctor_id)
                let updated = false;
                if (doctorId) {
                  const [urows] = await conn.query('SELECT id FROM clinics WHERE doctor_id = ? LIMIT 1', [doctorId]);
                  if (urows && urows.length) {
                    const cid = urows[0].id;
                    try {
                      await conn.query('UPDATE clinics SET name = ?, address = ?, location = ?, schedule = ?, description = ? WHERE id = ?', [clinic_name, locationVal, locationVal, scheduleVal, clinic_description || null, cid]);
                    } catch (e) {
                      // fallback: try without description (column may not exist)
                      await conn.query('UPDATE clinics SET name = ?, address = ?, location = ?, schedule = ? WHERE id = ?', [clinic_name, locationVal, locationVal, scheduleVal, cid]);
                    }
                    createdClinicId = cid; updated = true;
                  }
                }
                if (!updated) {
                  // insert new clinic and associate doctor_id when known
                  const cols = ['tenant_id','name','schedule','created_at'];
                  const vals = [null, clinic_name, scheduleVal, new Date()];
                  // include location/address column appropriately
                  const [cColsAll] = await conn.query('SHOW COLUMNS FROM clinics');
                  const cNames = (cColsAll || []).map(c => c.Field);
                  if (cNames.includes('address')) { cols.splice(1,0,'address'); vals.splice(1,0,locationVal); }
                  else if (cNames.includes('location')) { cols.splice(1,0,'location'); vals.splice(1,0,locationVal); }
                  if (cNames.includes('description') && clinic_description !== undefined) { cols.push('description'); vals.push(clinic_description); }
                  if (cNames.includes('doctor_id') && doctorId) { cols.push('doctor_id'); vals.push(doctorId); }
                  const placeholders = cols.map(() => '?').join(',');
                  const sql = `INSERT INTO clinics (${cols.join(',')}) VALUES (${placeholders})`;
                  const [ins] = await conn.query(sql, vals);
                  if (ins && ins.insertId) createdClinicId = ins.insertId;
                }
              }
            } catch (e) {
              // if clinics table missing or insert fails, log and continue — don't block profile update
              console.warn('clinic insert skipped or failed', e && e.code ? e.code : e);
            }
          }

          // If clinic_schedule provided but no clinic_name, try to update existing clinic if linked
          if (clinic_schedule !== undefined && createdClinicId === null && existingDoctor) {
            try {
              const scheduleVal = typeof clinic_schedule === 'string' ? clinic_schedule : JSON.stringify(clinic_schedule);
              let targetCid = null;
              // find any clinic linked to this doctor
              const [cfind] = await conn.query('SELECT id FROM clinics WHERE doctor_id = ? LIMIT 1', [existingDoctor.id]);
              if (cfind && cfind.length) targetCid = cfind[0].id;
                if (targetCid) {
                try {
                  await conn.query('UPDATE clinics SET schedule = ?, description = ? WHERE id = ?', [scheduleVal, clinic_description || null, targetCid]);
                } catch (e) {
                  await conn.query('UPDATE clinics SET schedule = ? WHERE id = ?', [scheduleVal, targetCid]);
                }
                createdClinicId = targetCid;
              }
            } catch (e) {
              console.warn('clinic schedule update skipped or failed', e && e.code ? e.code : e);
            }
          }

          // handle updating/creating clinic rows for clinic_location if provided
          if (clinic_location !== undefined) {
            try {
              const [tbls2] = await conn.query("SHOW TABLES LIKE 'clinics'");
              if (tbls2 && tbls2.length) {
                const locVal = clinic_location;
                if (existingDoctor) {
                  let cid = null;
                  const [cfind] = await conn.query('SELECT id FROM clinics WHERE doctor_id = ? LIMIT 1', [existingDoctor.id]);
                  if (cfind && cfind.length) cid = cfind[0].id;
                  if (cid) {
                    // prefer address column if present
                    const [cCols] = await conn.query("SHOW COLUMNS FROM clinics LIKE 'address'");
                    if (cCols && cCols.length) {
                      try { await conn.query('UPDATE clinics SET address = ?, description = ? WHERE id = ?', [locVal, clinic_description || null, cid]); }
                      catch (e) { await conn.query('UPDATE clinics SET address = ? WHERE id = ?', [locVal, cid]); }
                    } else {
                      try { await conn.query('UPDATE clinics SET location = ?, description = ? WHERE id = ?', [locVal, clinic_description || null, cid]); }
                      catch (e) { await conn.query('UPDATE clinics SET location = ? WHERE id = ?', [locVal, cid]); }
                    }
                    createdClinicId = cid;
                  } else {
                  // create a clinic row to hold the location
                  const [cColsAll] = await conn.query('SHOW COLUMNS FROM clinics');
                  const cNames = (cColsAll || []).map(c => c.Field);
                  const cols = [];
                  const vals = [];
                  if (cNames.includes('user_id')) { cols.push('user_id'); vals.push(userId); }
                  if (cNames.includes('tenant_id')) { cols.push('tenant_id'); vals.push(null); }
                  if (cNames.includes('name')) { cols.push('name'); vals.push(clinic_name || `Clinic ${existingDoctor ? existingDoctor.id : userId}`); }
                  if (cNames.includes('address')) { cols.push('address'); vals.push(locVal); }
                  else if (cNames.includes('location')) { cols.push('location'); vals.push(locVal); }
                  if (cNames.includes('schedule') && clinic_schedule !== undefined) { cols.push('schedule'); vals.push(typeof clinic_schedule === 'string' ? clinic_schedule : JSON.stringify(clinic_schedule)); }
                  if (cNames.includes('description') && clinic_description !== undefined) { cols.push('description'); vals.push(clinic_description); }
                  if (cNames.includes('created_at')) { cols.push('created_at'); vals.push(new Date()); }
                  if (cols.length) {
                    const placeholders = cols.map(() => '?').join(',');
                    const [ins2] = await conn.query(`INSERT INTO clinics (${cols.join(',')}) VALUES (${placeholders})`, vals);
                    if (ins2 && ins2.insertId) createdClinicId = ins2.insertId;
                  }
                }
              }
            }
            } catch (e) {
              console.warn('clinic location insert/update skipped', e && e.code ? e.code : e);
            }
          }

          const docSets = [];
          const docParams = [];
          if (specialty !== undefined && (available === null || available.has('specialty'))) { docSets.push('specialty = ?'); docParams.push(specialty); }
          if (clinic_address !== undefined && (available === null || available.has('clinic_address'))) { docSets.push('clinic_address = ?'); docParams.push(clinic_address); }
          // if we created a clinic and doctors table has clinic_id column, link it
          if (createdClinicId !== null && (available === null || available.has('clinic_id'))) { docSets.push('clinic_id = ?'); docParams.push(createdClinicId); }

          if (docSets.length) {
            // if clinic info provided, also mark profile_completed when the column exists
            if ((available === null || available.has('profile_completed')) && (clinic_schedule !== undefined || clinic_location !== undefined || clinic_address !== undefined || clinic_name !== undefined)) {
              docSets.push('profile_completed = ?');
              docParams.push(1);
            }
            docParams.push(userId);
            try {
              await conn.query(`UPDATE doctors SET ${docSets.join(', ')} WHERE user_id = ?`, docParams);
            } catch (e) {
              // if update fails due to missing columns, ignore to remain resilient
              if (e && e.code === 'ER_BAD_FIELD_ERROR') {
                // swallow and continue
              } else {
                throw e;
              }
            }
          }
        }
        await conn.commit();
        // return updated user
        const updated = await userModel.findById(userId);
        return res.json({ ok: true, user: updated });
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }
    // Non-MySQL fallback: update in-memory user only
    if (userModel.updateById) {
      const updated = await userModel.updateById(userId, { name, phone, website, company });
      return res.json({ ok: true, user: updated });
    }
    return res.status(400).json({ error: 'Cannot update profile in current configuration' });
  } catch (e) {
    console.error('updateProfile error', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  const userPayload = req.user;
  if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });
  const userId = userPayload.userId;
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  try {
    const bcrypt = require('bcrypt');
    // verify current password
    let currentHash = null;
    if (process.env.USE_MYSQL) {
      const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (!rows || !rows.length) return res.status(404).json({ error: 'User not found' });
      currentHash = rows[0].password_hash;
    } else if (userModel.findById) {
      const u = await userModel.findById(userId);
      if (!u) return res.status(404).json({ error: 'User not found' });
      currentHash = u.password_hash || u.password;
    } else if (userModel.findByEmail) {
      // in-memory fallback
      const u = userModel.findByEmail(userPayload.email || '');
      if (!u) return res.status(404).json({ error: 'User not found' });
      currentHash = u.password_hash || u.password;
    }
    if (!currentHash) return res.status(400).json({ error: 'Cannot verify current password' });
    const ok = await bcrypt.compare(oldPassword, currentHash);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    if (process.env.USE_MYSQL) {
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
      return res.json({ ok: true });
    }
    if (userModel.updateById) {
      await userModel.updateById(userId, { password_hash: hash });
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'Cannot change password in current configuration' });
  } catch (e) {
    console.error('changePassword error', e);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
