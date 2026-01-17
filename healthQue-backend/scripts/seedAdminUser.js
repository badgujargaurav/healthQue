// Seed admin user script
// Usage: set USE_MYSQL=1 and ensure DB config in .env, then run: node scripts/seedAdminUser.js

const bcrypt = require('bcrypt');
const { pool } = require('../db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hq.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234567';

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // ensure a tenant exists for admin; prefer slug 'hq' but handle schemas without slug
    let tenantId;
    try {
      const [tenants] = await conn.query('SELECT id FROM tenants WHERE slug = ? LIMIT 1', ['hq']);
      if (tenants && tenants[0]) tenantId = tenants[0].id;
    } catch (err) {
      // table may not have slug column; fall back to name lookup
    }
    if (!tenantId) {
      try {
        const [byName] = await conn.query('SELECT id FROM tenants WHERE name = ? LIMIT 1', ['HealthQue']);
        if (byName && byName[0]) tenantId = byName[0].id;
      } catch (err) {
        // ignore
      }
    }
    if (!tenantId) {
      // try inserting with slug, otherwise insert only name
      try {
        const [tRes] = await conn.query('INSERT INTO tenants (name, slug) VALUES (?, ?)', ['HealthQue', 'hq']);
        tenantId = tRes.insertId;
        console.log('Created tenant id', tenantId);
      } catch (err) {
        // maybe tenants table doesn't have slug column; insert only name
        const [tRes2] = await conn.query('INSERT INTO tenants (name) VALUES (?)', ['HealthQue']);
        tenantId = tRes2.insertId;
        console.log('Created tenant id (no-slug)', tenantId);
      }
    }

    // check for existing user
      // check for existing user
      const [rows] = await conn.query('SELECT id,email FROM users WHERE email = ? LIMIT 1', [ADMIN_EMAIL]).catch(() => [ [] ]);
      if (rows && rows[0]) {
        console.log('Admin user already exists:', rows[0].email, 'id=', rows[0].id);
        await conn.commit();
        return;
      }

      // inspect users table columns and insert compatible columns
      const [cols] = await conn.query('SHOW COLUMNS FROM users');
      const colNames = (cols || []).map(c => c.Field);
      const insertCols = [];
      const insertVals = [];
      if (colNames.includes('tenant_id')) { insertCols.push('tenant_id'); insertVals.push(tenantId); }
      if (colNames.includes('role')) { insertCols.push('role'); insertVals.push('admin'); }
      if (colNames.includes('name')) { insertCols.push('name'); insertVals.push('Admin User'); }
      else if (colNames.includes('full_name')) { insertCols.push('full_name'); insertVals.push('Admin User'); }
      if (colNames.includes('email')) { insertCols.push('email'); insertVals.push(ADMIN_EMAIL); }
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      if (colNames.includes('password_hash')) { insertCols.push('password_hash'); insertVals.push(hash); }
      else if (colNames.includes('password')) { insertCols.push('password'); insertVals.push(hash); }

      if (insertCols.length === 0) throw new Error('Users table has no expected columns to insert');

      const placeholders = insertCols.map(() => '?').join(',');
      const sql = `INSERT INTO users (${insertCols.join(',')}) VALUES (${placeholders})`;
      const [uRes] = await conn.query(sql, insertVals);
      console.log('Inserted admin user id', uRes.insertId);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    console.error('Failed to seed admin user', e);
    process.exit(2);
  } finally {
    conn.release();
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(2); });
