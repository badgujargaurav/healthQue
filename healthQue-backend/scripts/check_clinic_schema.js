#!/usr/bin/env node
const { pool } = require('../db');

(async function main(){
  try{
    console.log('\n--- SHOW COLUMNS FROM doctors ---');
    const [docCols] = await pool.query('SHOW COLUMNS FROM doctors');
    if(!docCols || !docCols.length){
      console.log('doctors: no columns returned');
    } else {
      console.log(docCols.map(c => c.Field).join(', '));
    }

    const [tbls] = await pool.query("SHOW TABLES LIKE 'clinics'");
    if(!tbls || !tbls.length){
      console.log('\nclinics table: MISSING');
    } else {
      console.log('\n--- SHOW COLUMNS FROM clinics ---');
      const [cres] = await pool.query('SHOW COLUMNS FROM clinics');
      console.log(cres.map(c => c.Field).join(', '));
      const [count] = await pool.query('SELECT COUNT(*) as cnt FROM clinics');
      console.log('\nclinics rows:', count[0].cnt);
    }

    await pool.end();
    process.exit(0);
  }catch(e){
    console.error('Error checking schema:', e && e.message ? e.message : e);
    try{ await pool.end(); }catch(_){ }
    process.exit(1);
  }
})();
