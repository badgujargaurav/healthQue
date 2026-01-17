const { pool } = require('../db');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sessionModel = require('../models/sessionModel');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || (process.env.JWT_SECRET || 'dev-secret');

exports.validate = () => [
  body('tenantName').isLength({ min: 2 }),
  body('doctorName').isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
];

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { tenantName, doctorName, email, password, specialty } = req.body;
  const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-4);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [tRes] = await conn.query('INSERT INTO tenants (name, slug) VALUES (?, ?)', [tenantName, slug]);
    const tenantId = tRes.insertId;
    const tempPassword = password;
    const passwordHash = await bcrypt.hash(password, 10);

    // insert user dynamically based on available columns
    const [userCols] = await conn.query('SHOW COLUMNS FROM users');
    const userColNames = (userCols || []).map(c => c.Field);
    const uInsertCols = [];
    const uInsertVals = [];
    if (userColNames.includes('tenant_id')) { uInsertCols.push('tenant_id'); uInsertVals.push(tenantId); }
    if (userColNames.includes('role')) { uInsertCols.push('role'); uInsertVals.push('doctor'); }
    if (userColNames.includes('full_name')) { uInsertCols.push('full_name'); uInsertVals.push(doctorName); }
    else if (userColNames.includes('name')) { uInsertCols.push('name'); uInsertVals.push(doctorName); }
    if (userColNames.includes('email')) { uInsertCols.push('email'); uInsertVals.push(email); }
    if (userColNames.includes('password_hash')) { uInsertCols.push('password_hash'); uInsertVals.push(passwordHash); }
    else if (userColNames.includes('password')) { uInsertCols.push('password'); uInsertVals.push(passwordHash); }
    const userPlaceholders = uInsertCols.map(() => '?').join(',');
    const userSql = `INSERT INTO users (${uInsertCols.join(',')}) VALUES (${userPlaceholders})`;
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
    const dPlaceholders = dInsertCols.map(() => '?').join(',');
    const dSql = `INSERT INTO doctors (${dInsertCols.join(',')}) VALUES (${dPlaceholders})`;
    const [dRes] = await conn.query(dSql, dInsertVals);
    await conn.commit();

    const accessToken = jwt.sign({ userId, tenantId, role: 'doctor' }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId, tenantId, role: 'doctor' }, REFRESH_SECRET, { expiresIn: '30d' });
    // persist refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await sessionModel.createSession({ tenantId, userId, refreshToken, expiresAt });

    // send onboarding email (best-effort)
    try {
      const { sendMail } = require('../utils/mailer');
      const { onboardingEmail } = require('../utils/emailTemplates');
      const androidUrl = process.env.MOBILE_ANDROID_URL || '';
      const iosUrl = process.env.MOBILE_IOS_URL || '';
      const webUrl = process.env.WEB_APP_URL || process.env.FRONTEND_URL || '';
      const tpl = onboardingEmail({ name: doctorName, email, tempPassword, androidUrl, iosUrl, webUrl });
      sendMail({ to: email, subject: tpl.subject, html: tpl.html }).catch(err => console.error('Failed to send onboarding email', err && err.message ? err.message : err));
    } catch (err) {
      console.error('Onboarding email error:', err && err.message ? err.message : err);
    }

    res.status(201).json({ tenant: { id: tenantId, name: tenantName, slug }, user: { id: userId, name: doctorName, email }, token: accessToken, refreshToken });
  } catch (e) {
    await conn.rollback();
    console.error('tenant register error', e);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    conn.release();
  }
};
