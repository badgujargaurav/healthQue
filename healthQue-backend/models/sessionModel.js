const { pool } = require('../db');

async function createSession({ tenantId, userId, refreshToken, expiresAt }) {
  const [res] = await pool.query(
    'INSERT INTO sessions (tenant_id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
    [tenantId || null, userId, refreshToken, expiresAt]
  );
  return res.insertId;
}

async function findActiveSession(refreshToken) {
  const [rows] = await pool.query('SELECT * FROM sessions WHERE refresh_token = ? AND revoked = 0 AND expires_at > NOW() LIMIT 1', [refreshToken]);
  return rows[0];
}

async function revokeSessionById(id) {
  await pool.query('UPDATE sessions SET revoked = 1 WHERE id = ?', [id]);
}

async function rotateSession(oldRefreshToken, newRefreshToken, expiresAt) {
  const session = await findActiveSession(oldRefreshToken);
  if (!session) return null;
  // create new session for same user/tenant
  const newId = await createSession({ tenantId: session.tenant_id, userId: session.user_id, refreshToken: newRefreshToken, expiresAt });
  // revoke old session
  await revokeSessionById(session.id);
  return { oldId: session.id, newId };
}

module.exports = {
  createSession,
  findActiveSession,
  revokeSessionById
};
