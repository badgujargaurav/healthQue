// Simple doctor model with optional MySQL integration
const USE_MYSQL = !!process.env.USE_MYSQL;

let dbPool = null;
if (USE_MYSQL) {
  const mysql = require('mysql2/promise');
  dbPool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_DB || 'healthque',
    waitForConnections: true,
    connectionLimit: 10
  });
}

// in-memory sample data
const doctors = [
  { id: 1, name: 'Dr. Alice Smith', specialty: 'Cardiology', location: 'New York', email: 'alice@hq.com', phone: '555-1001' },
  { id: 2, name: 'Dr. Bob Jones', specialty: 'Dermatology', location: 'Boston', email: 'bob@hq.com', phone: '555-1002' },
  { id: 3, name: 'Dr. Carol Lee', specialty: 'Pediatrics', location: 'San Francisco', email: 'carol@hq.com', phone: '555-1003' },
  { id: 4, name: 'Dr. Daniel Kim', specialty: 'Neurology', location: 'Chicago', email: 'daniel@hq.com', phone: '555-1004' },
  { id: 5, name: 'Dr. Eva Green', specialty: 'Oncology', location: 'Seattle', email: 'eva@hq.com', phone: '555-1005' }
];

async function listDoctors({ filter, sortBy = 'id', sortDir = 'asc', page = 1, limit = 100 }) {
  if (USE_MYSQL && dbPool) {
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    // load doctor table columns once
    let doctorCols = [];
    try {
      const [cols] = await dbPool.query('SHOW COLUMNS FROM doctors');
      doctorCols = (cols || []).map(c => c.Field);
    } catch (e) {
      doctorCols = [];
    }
    const hasClinicLocation = doctorCols.includes('clinic_location');
    const hasClinicAddress = doctorCols.includes('clinic_address');
    const hasClinicId = doctorCols.includes('clinic_id');
    const hasSpecialty = doctorCols.includes('specialty');

    if (filter) {
      const f = `%${filter}%`;
      // name always from users.full_name
      const parts = ['u.full_name LIKE ?', 'u.email LIKE ?'];
      params.push(f, f);
      if (hasSpecialty) { parts.push('d.specialty LIKE ?'); params.push(f); }
      if (hasClinicLocation) { parts.push('d.clinic_location LIKE ?'); params.push(f); }
      else if (hasClinicAddress) { parts.push('d.clinic_address LIKE ?'); params.push(f); }
      else if (hasClinicId) { parts.push('CAST(d.clinic_id AS CHAR) LIKE ?'); params.push(f); }
      whereClauses.push('(' + parts.join(' OR ') + ')');
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // determine order expression safely
    let orderExpr = 'd.id';
    if (sortBy === 'name') orderExpr = 'u.full_name';
    else if (sortBy === 'email') orderExpr = 'u.email';
    else if (sortBy === 'specialty' && hasSpecialty) orderExpr = 'd.specialty';
    else if (sortBy === 'location') {
      if (hasClinicLocation) orderExpr = 'd.clinic_location';
      else if (hasClinicAddress) orderExpr = 'd.clinic_address';
      else if (hasClinicId) orderExpr = 'd.clinic_id';
    }
    const order = `ORDER BY ${orderExpr} ${sortDir === 'desc' ? 'DESC' : 'ASC'}`;

    // total count (join users)
    const [countRows] = await dbPool.query(`SELECT COUNT(*) as cnt FROM doctors d JOIN users u ON d.user_id = u.id ${where}`, params);
    const total = countRows[0]?.cnt || 0;

    // build select columns based on available fields; join clinics to obtain address when needed
    const selectCols = ['d.id', 'u.full_name as name'];
    if (hasSpecialty) selectCols.push('d.specialty');
    // prefer doctor-level clinic_location/address, otherwise use linked clinic's address/location
    if (hasClinicLocation) selectCols.push("COALESCE(d.clinic_location, d.clinic_address, c.address, c.location, CAST(d.clinic_id AS CHAR), CAST(c.doctor_id AS CHAR)) as location");
    else if (hasClinicAddress) selectCols.push("COALESCE(d.clinic_address, c.address, c.location, CAST(d.clinic_id AS CHAR), CAST(c.doctor_id AS CHAR)) as location");
    else if (hasClinicId) selectCols.push("COALESCE(c.address, c.location, CAST(d.clinic_id AS CHAR), CAST(c.doctor_id AS CHAR)) as location");
    selectCols.push('u.email', 'u.phone');

    // join clinics either by explicit clinic_id (when present in schema) or by clinics.doctor_id linking back to this doctor
    const joinExpr = hasClinicId ? '(d.clinic_id = c.id OR c.doctor_id = d.id)' : '(c.doctor_id = d.id)';
    const sql = `SELECT ${selectCols.join(', ')} FROM doctors d JOIN users u ON d.user_id = u.id LEFT JOIN clinics c ON ${joinExpr} ${where} ${order} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const [rows] = await dbPool.query(sql, params);
    return { data: rows, total };
  }

  // in-memory filtering/sorting/pagination
  let result = doctors.slice();
  if (filter) {
    const f = filter.toLowerCase();
    result = result.filter(d => (d.name + ' ' + d.specialty + ' ' + d.location + ' ' + (d.email || '')).toLowerCase().includes(f));
  }
  result.sort((a, b) => {
    const aVal = (a[sortBy] || '').toString().toLowerCase();
    const bVal = (b[sortBy] || '').toString().toLowerCase();
    if (aVal < bVal) return sortDir === 'desc' ? 1 : -1;
    if (aVal > bVal) return sortDir === 'desc' ? -1 : 1;
    return 0;
  });
  const total = result.length;
  const start = (page - 1) * limit;
  const pageData = result.slice(start, start + Number(limit));
  return { data: pageData, total };
}

async function createDoctor({ name, email, specialty, location, phone }) {
  if (USE_MYSQL && dbPool) {
    // For now, require creating a user/doctor via tenant/user flows in DB.
    throw new Error('Creating doctors in MySQL must be done through tenant/user registration flow; use createDoctorAdmin for admin-created doctors');
  }
  const id = doctors.reduce((m, d) => Math.max(m, d.id), 0) + 1;
  const doc = { id, name, email, specialty: specialty || null, location: location || null, phone: phone || null };
  doctors.push(doc);
  return doc;
}

async function createDoctorAdmin({ tenantId, name, email, password, specialty, location, phone }) {
  if (USE_MYSQL && dbPool) {
    const bcrypt = require('bcrypt');
    const tempPassword = password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();
      // if tenantId not provided, create a new tenant for this doctor
      if (!tenantId) {
        const slugBase = (name || 'tenant').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
        // insert into tenants using only available columns
        let tenantCols = [];
        try {
          const [tcols] = await conn.query('SHOW COLUMNS FROM tenants');
          tenantCols = (tcols || []).map(c => c.Field);
        } catch (err) {
          tenantCols = [];
        }
        const tInsertCols = [];
        const tInsertVals = [];
        if (tenantCols.includes('name')) { tInsertCols.push('name'); tInsertVals.push(name || 'Tenant'); }
        if (tenantCols.includes('slug')) { tInsertCols.push('slug'); tInsertVals.push(slug); }
        // fallback: if tenants table has no recognized columns, create with raw SQL name only
        if (tInsertCols.length === 0) {
          const [tRes] = await conn.query('INSERT INTO tenants (name) VALUES (?)', [name || 'Tenant']);
          tenantId = tRes.insertId;
        } else {
          const placeholders = tInsertCols.map(() => '?').join(',');
          const tSql = `INSERT INTO tenants (${tInsertCols.join(',')}) VALUES (${placeholders})`;
          const [tRes] = await conn.query(tSql, tInsertVals);
          tenantId = tRes.insertId;
        }
      }
      // determine users table columns and insert compatible fields
      const [userCols] = await conn.query('SHOW COLUMNS FROM users');
      const userColNames = (userCols || []).map(c => c.Field);
      const uInsertCols = [];
      const uInsertVals = [];
      if (userColNames.includes('tenant_id')) { uInsertCols.push('tenant_id'); uInsertVals.push(tenantId); }
      if (userColNames.includes('role')) { uInsertCols.push('role'); uInsertVals.push('doctor'); }
      if (userColNames.includes('full_name')) { uInsertCols.push('full_name'); uInsertVals.push(name); }
      else if (userColNames.includes('name')) { uInsertCols.push('name'); uInsertVals.push(name); }
      if (userColNames.includes('email')) { uInsertCols.push('email'); uInsertVals.push(email); }
      if (userColNames.includes('password_hash')) { uInsertCols.push('password_hash'); uInsertVals.push(passwordHash); }
      else if (userColNames.includes('password')) { uInsertCols.push('password'); uInsertVals.push(passwordHash); }
      if (userColNames.includes('phone') && phone) { uInsertCols.push('phone'); uInsertVals.push(phone); }
      if (uInsertCols.length === 0) throw new Error('No compatible columns found in users table');
      const placeholders = uInsertCols.map(() => '?').join(',');
      const userSql = `INSERT INTO users (${uInsertCols.join(',')}) VALUES (${placeholders})`;
      const [uRes] = await conn.query(userSql, uInsertVals);
      const userId = uRes.insertId;

      // insert into doctors table with available columns
      const [docCols] = await conn.query('SHOW COLUMNS FROM doctors');
      const docColNames = (docCols || []).map(c => c.Field);
      const dInsertCols = [];
      const dInsertVals = [];
      if (docColNames.includes('user_id')) { dInsertCols.push('user_id'); dInsertVals.push(userId); }
      if (docColNames.includes('tenant_id')) { dInsertCols.push('tenant_id'); dInsertVals.push(tenantId); }
      if (docColNames.includes('specialty')) { dInsertCols.push('specialty'); dInsertVals.push(specialty || null); }
      // prefer textual clinic_location if available
      if (docColNames.includes('clinic_location')) { dInsertCols.push('clinic_location'); dInsertVals.push(location || null); }
      else if (docColNames.includes('clinic_address')) { dInsertCols.push('clinic_address'); dInsertVals.push(location || null); }
      else if (docColNames.includes('clinic_id') && location) {
        // only set clinic_id if location looks like an integer
        const asInt = parseInt(location, 10);
        if (!Number.isNaN(asInt) && String(asInt) === String(location)) {
          dInsertCols.push('clinic_id'); dInsertVals.push(asInt);
        }
      }
      const dPlaceholders = dInsertCols.map(() => '?').join(',');
      const dSql = `INSERT INTO doctors (${dInsertCols.join(',')}) VALUES (${dPlaceholders})`;
      const [dRes] = await conn.query(dSql, dInsertVals);

      await conn.commit();

      // send onboarding email (non-blocking; log on error)
      try {
        const { sendMail } = require('../utils/mailer');
        const { onboardingEmail } = require('../utils/emailTemplates');
        const androidUrl = process.env.MOBILE_ANDROID_URL || '';
        const iosUrl = process.env.MOBILE_IOS_URL || '';
        const webUrl = process.env.WEB_APP_URL || process.env.FRONTEND_URL || '';
        const tpl = onboardingEmail({ name, email, tempPassword, androidUrl, iosUrl, webUrl });
        sendMail({ to: email, subject: tpl.subject, html: tpl.html }).catch(err => {
          console.error('Failed to send onboarding email to', email, err && err.message ? err.message : err);
        });
      } catch (err) {
        console.error('Onboarding email error:', err && err.message ? err.message : err);
      }

      // return the joined doctor/user row to match listDoctors shape
      const createdId = dRes.insertId;
      try {
        const created = await getDoctorById(createdId);
        return created || { id: createdId, user_id: userId, name, email, specialty: specialty || null, location: location || null, phone: phone || null };
      } catch (e) {
        return { id: createdId, user_id: userId, name, email, specialty: specialty || null, location: location || null, phone: phone || null };
      }
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  // in-memory fallback
  const doc = await createDoctor({ name, email, specialty, location, phone });
  return doc;
}

async function deleteDoctor(id) {
  if (USE_MYSQL && dbPool) {
    const [res] = await dbPool.query('DELETE FROM doctors WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }
  const idx = doctors.findIndex(d => String(d.id) === String(id));
  if (idx === -1) return false;
  doctors.splice(idx, 1);
  return true;
}

async function updateDoctorByUserId(userId, fields) {
    if (USE_MYSQL && dbPool) {
    // if clinic_location provided and doctor linked to clinic, update clinics table
    if (fields.clinic_location !== undefined || fields.clinic_address !== undefined) {
      const [drows] = await dbPool.query('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
      if (drows && drows.length) {
        const doc = drows[0];
        let cid = doc.clinic_id;
        if (!cid) {
          // try to find a clinic linked by doctor_id
          const [cfind] = await dbPool.query('SELECT id FROM clinics WHERE doctor_id = ? LIMIT 1', [doc.id]);
          if (cfind && cfind.length) cid = cfind[0].id;
        }
        if (cid) {
          const sets = [];
          const params = [];
          if (fields.clinic_location !== undefined) { sets.push('address = ?'); params.push(fields.clinic_location); }
          else if (fields.clinic_address !== undefined) { sets.push('address = ?'); params.push(fields.clinic_address); }
          if (sets.length) {
            await dbPool.query(`UPDATE clinics SET ${sets.join(', ')} WHERE id = ?`, [...params, cid]);
          }
          const [rows2] = await dbPool.query('SELECT id,user_id,specialty,created_at FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
          return rows2[0] || null;
        }
      }
    }
    const sets = [];
    const params = [];
    if (fields.specialty !== undefined) { sets.push('specialty = ?'); params.push(fields.specialty); }
    if (fields.clinic_location !== undefined) { sets.push('clinic_location = ?'); params.push(fields.clinic_location); }
    else if (fields.clinic_address !== undefined) { sets.push('clinic_address = ?'); params.push(fields.clinic_address); }
    if (sets.length === 0) return null;
    params.push(userId);
    const sql = `UPDATE doctors SET ${sets.join(', ')} WHERE user_id = ?`;
    await dbPool.query(sql, params);
    const [rows] = await dbPool.query('SELECT id,user_id,specialty,clinic_location,clinic_address,created_at FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  }
  // in-memory: no direct mapping to user_id, skip
  throw new Error('Doctor update is only supported when USE_MYSQL is enabled');
}

async function setUserActiveByDoctorId(doctorId, active) {
  if (USE_MYSQL && dbPool) {
    const [rows] = await dbPool.query('SELECT user_id FROM doctors WHERE id = ? LIMIT 1', [doctorId]);
    if (!rows || !rows[0]) return false;
    const userId = rows[0].user_id;
    await dbPool.query('UPDATE users SET active = ? WHERE id = ?', [active ? 1 : 0, userId]);
    return true;
  }
  const idx = doctors.findIndex(d => String(d.id) === String(doctorId));
  if (idx === -1) return false;
  doctors[idx].active = active ? 1 : 0;
  return true;
}

async function setTrialByDoctorId(doctorId, trialExpiresAt) {
  if (USE_MYSQL && dbPool) {
    const [rows] = await dbPool.query('SELECT user_id FROM doctors WHERE id = ? LIMIT 1', [doctorId]);
    if (!rows || !rows[0]) return false;
    const userId = rows[0].user_id;
    const val = trialExpiresAt ? new Date(trialExpiresAt) : null;
    await dbPool.query('UPDATE users SET trial_expires_at = ? WHERE id = ?', [val, userId]);
    return true;
  }
  const d = doctors.find(d => String(d.id) === String(doctorId));
  if (!d) return false;
  d.trial_expires_at = trialExpiresAt || null;
  return true;
}

module.exports = {
  listDoctors,
  createDoctor,
  deleteDoctor,
  updateDoctorByUserId,
  setUserActiveByDoctorId,
  setTrialByDoctorId
};

async function getDoctorById(id) {
  if (USE_MYSQL && dbPool) {
    // build SELECT dynamically based on available doctor columns
    let docColNames = [];
    try {
      const [cols] = await dbPool.query('SHOW COLUMNS FROM doctors');
      docColNames = (cols || []).map(c => c.Field);
    } catch (e) {
      docColNames = [];
    }
    const selectCols = ['d.id', 'd.user_id', 'u.full_name as name'];
    if (docColNames.includes('specialty')) selectCols.push('d.specialty');
    if (docColNames.includes('clinic_location')) selectCols.push('d.clinic_location');
    if (docColNames.includes('clinic_address')) selectCols.push('d.clinic_address');
    if (docColNames.includes('clinic_id')) selectCols.push('d.clinic_id');
    selectCols.push('u.email', 'u.phone');
    const sql = `SELECT ${selectCols.join(', ')} FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ? LIMIT 1`;
    const [rows] = await dbPool.query(sql, [id]);
    const row = rows[0] || null;
    if (row) {
      try {
        let cres = [];
        if (docColNames.includes('clinic_id') && row.clinic_id) {
          [cres] = await dbPool.query('SELECT id,name,address,location,schedule FROM clinics WHERE id = ? LIMIT 1', [row.clinic_id]);
        }
        if ((!cres || !cres.length) && row.id) {
          const [cres2] = await dbPool.query('SELECT id,name,address,location,schedule FROM clinics WHERE doctor_id = ? LIMIT 1', [row.id]);
          if (cres2 && cres2.length) cres = cres2;
        }
        if (cres && cres.length) {
          row.clinic = cres[0];
          if (!row.clinic_schedule && cres[0].schedule) row.clinic_schedule = cres[0].schedule;
          if (!row.clinic_name && cres[0].name) row.clinic_name = cres[0].name;
        }
      } catch (e) {
        // ignore
      }
    }
    return row;
  }
  const d = doctors.find(x => String(x.id) === String(id));
  return d || null;
}

module.exports.getDoctorById = getDoctorById;
module.exports.createDoctorAdmin = createDoctorAdmin;
async function listOffDays(doctorId, opts = {}) {
  if (USE_MYSQL && dbPool) {
    const params = [Number(doctorId)];
    let sql = 'SELECT id, doctor_id, start_date, end_date, is_recurring_weekly, day_of_week, type, reason, status, created_at FROM doctor_off_days WHERE doctor_id = ?';
    if (opts.type) { sql += ' AND type = ?'; params.push(opts.type); }
    // optional date range filter: return rows that overlap with given from/to
    if (opts.from && opts.to) {
      sql += ' AND ( (is_recurring_weekly = 0 AND (start_date <= ? AND (end_date IS NULL OR end_date >= ?))) OR is_recurring_weekly = 1 )';
      params.push(opts.to, opts.from);
    }
    const [rows] = await dbPool.query(sql, params);
    return rows;
  }
  // in-memory fallback: no persistence
  return [];
}

async function createOffDay({ doctorId, start_date, end_date = null, is_recurring_weekly = 0, day_of_week = null, type = 'scheduled', reason = null, status = 'off' }) {
  if (USE_MYSQL && dbPool) {
    // Try insert; on duplicate key update existing row (set status/type/reason)
    const sql = 'INSERT INTO doctor_off_days (doctor_id, start_date, end_date, is_recurring_weekly, day_of_week, type, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE end_date=VALUES(end_date), is_recurring_weekly=VALUES(is_recurring_weekly), day_of_week=VALUES(day_of_week), type=VALUES(type), reason=VALUES(reason), status=VALUES(status)';
    const params = [Number(doctorId), start_date, end_date || null, is_recurring_weekly ? 1 : 0, day_of_week != null ? Number(day_of_week) : null, type, reason, status || 'off'];
    const [res] = await dbPool.query(sql, params);
    // if inserted new row, res.insertId contains id; if updated, find the existing id
    let id = res.insertId;
    if (!id) {
      // attempt to locate the row: prefer matching non-recurring by doctor+start_date, else recurring by doctor+day_of_week
      if (!is_recurring_weekly) {
        const [rows1] = await dbPool.query('SELECT id FROM doctor_off_days WHERE doctor_id = ? AND start_date = ? LIMIT 1', [Number(doctorId), start_date]);
        id = rows1 && rows1[0] && rows1[0].id;
      } else {
        const [rows2] = await dbPool.query('SELECT id FROM doctor_off_days WHERE doctor_id = ? AND day_of_week = ? AND is_recurring_weekly = 1 LIMIT 1', [Number(doctorId), Number(day_of_week)]);
        id = rows2 && rows2[0] && rows2[0].id;
      }
    }
    if (id) {
      const [rows] = await dbPool.query('SELECT * FROM doctor_off_days WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    }
    return null;
  }
  return null;
}

async function getOffDayById(id) {
  if (USE_MYSQL && dbPool) {
    const [rows] = await dbPool.query('SELECT * FROM doctor_off_days WHERE id = ? LIMIT 1', [Number(id)]);
    return rows[0] || null;
  }
  return null;
}

async function deleteOffDay(id) {
  if (USE_MYSQL && dbPool) {
    // mark as working rather than physical delete to preserve history
    const [res] = await dbPool.query("UPDATE doctor_off_days SET status = 'working' WHERE id = ?", [Number(id)]);
    return res.affectedRows > 0;
  }
  return false;
}

module.exports.listOffDays = listOffDays;
module.exports.createOffDay = createOffDay;
module.exports.getOffDayById = getOffDayById;
module.exports.deleteOffDay = deleteOffDay;
async function updateOffDayStatus(id, status) {
  if (USE_MYSQL && dbPool) {
    const [res] = await dbPool.query('UPDATE doctor_off_days SET status = ? WHERE id = ?', [String(status), Number(id)]);
    if (res.affectedRows > 0) {
      const [rows] = await dbPool.query('SELECT * FROM doctor_off_days WHERE id = ? LIMIT 1', [Number(id)]);
      return rows[0] || null;
    }
    return null;
  }
  return null;
}
module.exports.updateOffDayStatus = updateOffDayStatus;

