// User model with optional MySQL backing. Auto-detect DB pool when available.
const bcrypt = require('bcrypt');
let USE_MYSQL = false;
let pool = null;
try {
  const db = require('../db');
  if (db && db.pool) {
    pool = db.pool;
    USE_MYSQL = true;
  } else {
    USE_MYSQL = !!process.env.USE_MYSQL;
    if (USE_MYSQL) pool = require('../db').pool;
  }
} catch (e) {
  USE_MYSQL = !!process.env.USE_MYSQL;
  if (USE_MYSQL) {
    try { pool = require('../db').pool; } catch (err) { pool = null; }
  }
}

// in-memory fallback store
const users = {
  'user@example.com': {
    id: 1,
    email: 'user@example.com',
    password: 'password123',
    name: 'Demo User',
    phone: '555-0100',
    website: 'example.com',
    company: { name: 'HealthQue Inc.' }
  }
};

const tokens = new Map();

async function findByEmail(email) {
  if (USE_MYSQL && pool) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  }
  return users[email] || null;
}

async function findById(id) {
  if (USE_MYSQL && pool) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }
  for (const k of Object.keys(users)) {
    if (users[k].id === id) return users[k];
  }
  return null;
}

async function updateById(id, fields) {
  if (USE_MYSQL && pool) {
    const sets = [];
    const params = [];
    for (const k of ['name', 'phone', 'website']) {
      if (fields[k] !== undefined) {
        sets.push(`${k} = ?`);
        params.push(fields[k]);
      }
    }
    if (sets.length === 0) return await findById(id);
    params.push(id);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);
    return await findById(id);
  }
  const u = await findById(id);
  if (!u) return null;
  Object.assign(u, fields);
  return u;
}

async function verifyPassword(email, pwd) {
  if (USE_MYSQL && pool) {
    const user = await findByEmail(email);
    if (!user) return false;
    const hash = user.password_hash || user.password;
    return await bcrypt.compare(pwd, hash);
  }
  const u = users[email];
  if (!u) return false;
  return u.password === pwd;
}

function generateTokenForUser(email) {
  const token = 't_' + Math.random().toString(36).slice(2) + Date.now();
  tokens.set(token, email);
  return token;
}

function getUserByToken(token) {
  return tokens.get(token) || null;
}

function invalidateToken(token) {
  tokens.delete(token);
}

module.exports = {
  findByEmail,
  findById,
  updateById,
  verifyPassword,
  generateTokenForUser,
  getUserByToken,
  invalidateToken
};

