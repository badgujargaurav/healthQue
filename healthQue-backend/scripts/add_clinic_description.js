#!/usr/bin/env node
const { pool } = require('../db');

(async function main(){
  try{
    const [tbls] = await pool.query("SHOW TABLES LIKE 'clinics'");
    if(!tbls || !tbls.length){
      console.log('clinics table not found; skipping description migration');
      await pool.end();
      return process.exit(0);
    }

    const [cols] = await pool.query("SHOW COLUMNS FROM clinics LIKE 'description'");
    if (!cols || cols.length === 0) {
      console.log('Adding missing `description` column to clinics table');
      try {
        await pool.query("ALTER TABLE clinics ADD COLUMN description TEXT NULL");
        console.log('`description` column added');
      } catch (e) {
        console.error('Failed adding description column to clinics:', e && e.message ? e.message : e);
        await pool.end();
        return process.exit(1);
      }
    } else {
      console.log('`description` column already present');
    }

    await pool.end();
    return process.exit(0);
  }catch(e){
    console.error('Migration failed:', e && e.message ? e.message : e);
    try{ await pool.end(); }catch(_){ }
    return process.exit(1);
  }
})();
