const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const sessionModel = require('../models/sessionModel');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || (process.env.JWT_SECRET || 'dev-secret');

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  if (!(await userModel.verifyPassword(email, password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = await userModel.findByEmail(email);
  const userId = user.id;
  const tenantId = user.tenant_id || user.tenantId || null;
  const role = user.role || 'doctor';
  const accessToken = jwt.sign({ userId, tenantId, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, tenantId, role }, REFRESH_SECRET, { expiresIn: '30d' });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sessionModel.createSession({ tenantId, userId, refreshToken, expiresAt });

  res.json({ token: accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } });
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    const session = await sessionModel.findActiveSession(refreshToken);
    if (session) await sessionModel.revokeSessionById(session.id);
  } else {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      // best effort: try to revoke by token value (if stored)
      const token = auth.split(' ')[1];
      const session = await sessionModel.findActiveSession(token);
      if (session) await sessionModel.revokeSessionById(session.id);
    }
  }
  res.json({ ok: true });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const session = await sessionModel.findActiveSession(refreshToken);
    if (!session) return res.status(401).json({ error: 'Invalid refresh token' });
    const accessToken = jwt.sign({ userId: payload.userId, tenantId: payload.tenantId, role: payload.role }, JWT_SECRET, { expiresIn: '15m' });
    // rotate refresh token: issue a new one and persist, revoke old
    const newRefreshToken = jwt.sign({ userId: payload.userId, tenantId: payload.tenantId, role: payload.role }, REFRESH_SECRET, { expiresIn: '30d' });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await sessionModel.rotateSession(refreshToken, newRefreshToken, expiresAt);
    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};
