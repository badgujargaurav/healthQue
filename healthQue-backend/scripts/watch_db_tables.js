#!/usr/bin/env node
/*
Simple watcher: polls SHOW TABLES every N seconds and runs dump when list changes.
Usage: node scripts/watch_db_tables.js [interval_seconds]
*/
const { dump } = require('./dump_db_tables');
const fs = require('fs');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'db.js');
let poolModule = null;
try { poolModule = require(dbPath); } catch (e) { poolModule = null; }

async function makePool() {
  if (poolModule && poolModule.pool) return poolModule.pool;
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_DB || 'healthque',
    waitForConnections: true,
    connectionLimit: 2
  });
  return pool;
}

async function listTables(pool) {
  const [rows] = await pool.query('SHOW TABLES');
  const names = [];
  for (const r of rows) {
    const keys = Object.keys(r);
    if (keys.length) names.push(r[keys[0]]);
  }
  return names.sort();
}

async function watch(interval = 10) {
  const pool = await makePool();
  let last = [];
  try {
    last = await listTables(pool);
  } catch (e) { last = []; }
  console.log('Starting DB table watcher; initial table count', last.length);
  setInterval(async () => {
    try {
      const cur = await listTables(pool);
      const equal = JSON.stringify(cur) === JSON.stringify(last);
      if (!equal) {
        console.log('Table list changed — dumping tables');
        await dump();
        last = cur;
      }
    } catch (e) {
      console.error('Watcher error', e && e.message);
    }
  }, (interval || 10) * 1000);
}

if (require.main === module) {
  const arg = Number(process.argv[2]) || 10;
  watch(arg).catch(err => { console.error(err); process.exit(1); });
}
