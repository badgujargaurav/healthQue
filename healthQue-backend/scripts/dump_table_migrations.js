#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

(async function main(){
  try{
    // ensure migrations dir exists
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });

    // list tables in current DB
    const [tables] = await pool.query("SHOW TABLES");
    const tableKey = tables.length && Object.keys(tables[0])[0];
    const tableNames = (tables || []).map(r => r[tableKey]);
    if (!tableNames.length) {
      console.log('No tables found in database');
      await pool.end();
      return process.exit(0);
    }

    for (const name of tableNames) {
      try {
        const [rows] = await pool.query(`SHOW CREATE TABLE \`${name}\``);
        if (!rows || !rows.length) continue;
        const createSql = rows[0]['Create Table'] || rows[0]['Create View'] || rows[0]['Create Procedure'];
        if (!createSql) continue;
        // write migration file named by timestamp and table
        const safeName = `table_${name}`;
        const fileName = `${new Date().toISOString().replace(/[:.]/g,'-')}_${safeName}.sql`;
        const filePath = path.join(migrationsDir, fileName);
        const content = `-- migration generated from current schema for table: ${name}\n${createSql};\n`;
        if (fs.existsSync(filePath)) {
          console.log('Migration file already exists for', name, fileName);
        } else {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log('Wrote', fileName);
        }
      } catch (e) {
        console.warn('Failed dumping table', name, e && e.message ? e.message : e);
      }
    }

    await pool.end();
    console.log('Done');
    process.exit(0);
  }catch(e){
    console.error('Error generating migrations:', e && e.message ? e.message : e);
    try{ await pool.end(); }catch(_){ }
    process.exit(1);
  }
})();
