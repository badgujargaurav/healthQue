#!/usr/bin/env node
const { pool } = require('../db');

(async function(){
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ensure clinics.schedule exists
    const [clinicCol] = await conn.query("SHOW COLUMNS FROM clinics LIKE 'schedule'");
    if (!clinicCol || clinicCol.length === 0) {
      console.log('Adding clinics.schedule column');
      await conn.query('ALTER TABLE clinics ADD COLUMN schedule TEXT DEFAULT NULL');
    } else {
      console.log('clinics.schedule already exists');
    }

    // 1) update existing clinics from doctors where clinic data exists (schedule + location)
    console.log('Updating existing clinics from doctors (schedule + location)');
    // determine doctor columns to see if clinic_schedule exists
    const [docColsAllInitial] = await conn.query("SHOW COLUMNS FROM doctors");
    const docColNamesInitial = (docColsAllInitial || []).map(c => c.Field);
    // update schedule if doctors have clinic_schedule
    if (docColNamesInitial.includes('clinic_schedule')) {
      if (docColNamesInitial.includes('clinic_id')) {
        await conn.query("UPDATE clinics c JOIN doctors d ON c.id = d.clinic_id SET c.schedule = d.clinic_schedule WHERE d.clinic_schedule IS NOT NULL AND d.clinic_id IS NOT NULL");
      } else {
        // use clinics.doctor_id to map doctors to clinics
        await conn.query("UPDATE clinics c JOIN doctors d ON c.doctor_id = d.id SET c.schedule = d.clinic_schedule WHERE d.clinic_schedule IS NOT NULL");
      }
    } else {
      console.log('doctors.clinic_schedule column not present; skipping schedule copy');
    }
    // update location/address if available
    // prefer clinics.address column if present
    const [clinicColsAll2] = await conn.query("SHOW COLUMNS FROM clinics");
    const clinicColNames = (clinicColsAll2 || []).map(c => c.Field);
    if (clinicColNames.includes('address') || clinicColNames.includes('location')) {
      const hasDocLocation = docColNamesInitial.includes('clinic_location');
      const hasDocAddress = docColNamesInitial.includes('clinic_address');
      const coalesceParts = [];
      if (hasDocLocation) coalesceParts.push('d.clinic_location');
      if (hasDocAddress) coalesceParts.push('d.clinic_address');
      coalesceParts.push('NULL');
      const coalesceExpr = `COALESCE(${coalesceParts.join(',')})`;
      const whereParts = [];
      if (hasDocLocation) whereParts.push('d.clinic_location IS NOT NULL');
      if (hasDocAddress) whereParts.push('d.clinic_address IS NOT NULL');
      let whereExpr = whereParts.length ? `(${whereParts.join(' OR ')})` : '1=1';
      if (docColNamesInitial.includes('clinic_id')) {
        whereExpr = whereParts.length ? `(${whereParts.join(' OR ')}) AND d.clinic_id IS NOT NULL` : 'd.clinic_id IS NOT NULL';
        if (clinicColNames.includes('address')) {
          await conn.query(`UPDATE clinics c JOIN doctors d ON c.id = d.clinic_id SET c.address = ${coalesceExpr} WHERE ${whereExpr}`);
        } else {
          await conn.query(`UPDATE clinics c JOIN doctors d ON c.id = d.clinic_id SET c.location = ${coalesceExpr} WHERE ${whereExpr}`);
        }
      } else {
        // join by clinics.doctor_id
        if (clinicColNames.includes('address')) {
          await conn.query(`UPDATE clinics c JOIN doctors d ON c.doctor_id = d.id SET c.address = ${coalesceExpr} WHERE ${whereExpr}`);
        } else {
          await conn.query(`UPDATE clinics c JOIN doctors d ON c.doctor_id = d.id SET c.location = ${coalesceExpr} WHERE ${whereExpr}`);
        }
      }
    }

    // 2) insert clinics for doctors without clinic_id but with clinic_schedule
    console.log('Inserting clinics for doctors with clinic_schedule and no clinic_id (best-effort mapping to existing clinics schema)');
    // determine clinics table columns to pick appropriate insert columns
    const [clinicColsAll] = await conn.query("SHOW COLUMNS FROM clinics");
    // determine doctor columns too
    const [docColsAll] = await conn.query("SHOW COLUMNS FROM doctors");
    const docColNames = (docColsAll || []).map(c => c.Field);
    const insertCols = [];
    const selectExprs = [];
    // prefer tenant_id if present
    if (clinicColNames.includes('tenant_id')) { insertCols.push('tenant_id'); selectExprs.push('d.tenant_id'); }
    // name should be present
    if (clinicColNames.includes('name')) { insertCols.push('name'); selectExprs.push("CONCAT('Clinic ', d.id)"); }
    // map location/address
    if (clinicColNames.includes('location')) {
      insertCols.push('location');
      if (docColNames.includes('clinic_location')) selectExprs.push('d.clinic_location');
      else if (docColNames.includes('clinic_address')) selectExprs.push('d.clinic_address');
      else selectExprs.push('NULL');
    }
    else if (clinicColNames.includes('address')) {
      insertCols.push('address');
      if (docColNames.includes('clinic_location')) selectExprs.push('d.clinic_location');
      else if (docColNames.includes('clinic_address')) selectExprs.push('d.clinic_address');
      else selectExprs.push('NULL');
    }
    // phone may be present
    if (clinicColNames.includes('phone')) { insertCols.push('phone'); selectExprs.push('NULL'); }
    // schedule column should now exist
    if (clinicColNames.includes('schedule')) { insertCols.push('schedule'); selectExprs.push('d.clinic_schedule'); }
    // created_at
    if (clinicColNames.includes('created_at')) { insertCols.push('created_at'); selectExprs.push('NOW()'); }

    if (insertCols.length > 0) {
      if (docColNames.includes('clinic_schedule')) {
        let insertSql;
        if (docColNames.includes('clinic_id')) {
          insertSql = `INSERT INTO clinics (${insertCols.join(',')}) SELECT ${selectExprs.join(',')} FROM doctors d WHERE d.clinic_schedule IS NOT NULL AND (d.clinic_id IS NULL OR d.clinic_id = 0)`;
        } else {
          // no clinic_id column on doctors; insert for any doctor with schedule
          insertSql = `INSERT INTO clinics (${insertCols.join(',')}) SELECT ${selectExprs.join(',')} FROM doctors d WHERE d.clinic_schedule IS NOT NULL`;
        }
        await conn.query(insertSql);
      } else {
        console.log('doctors.clinic_schedule missing; skipping schedule-based inserts');
      }
    } else {
      console.log('No compatible insert columns found in clinics table; skipping inserts');
    }

    // 3) link newly inserted clinics back to doctors by matching generated name
    console.log('Linking inserted clinics back to doctors by clinic name');
    // Only proceed if clinics.name exists
    if (clinicColNames.includes('name')) {
      // prefer writing back to clinics.doctor_id rather than doctors.clinic_id
      await conn.query("UPDATE clinics c JOIN doctors d ON c.name = CONCAT('Clinic ', d.id) SET c.doctor_id = d.id WHERE c.doctor_id IS NULL");
    } else {
      console.log('clinics.name column missing; cannot link inserted clinics to doctors');
    }

    // 4) also insert clinics for doctors who have clinic_location but no clinic_schedule and no clinic_id
    if (clinicColNames.includes('address') || clinicColNames.includes('location')) {
      const extraInsertCols = [];
      const extraSelects = [];
      if (clinicColNames.includes('tenant_id')) { extraInsertCols.push('tenant_id'); extraSelects.push('d.tenant_id'); }
      if (clinicColNames.includes('name')) { extraInsertCols.push('name'); extraSelects.push("CONCAT('Clinic ', d.id)"); }
      if (clinicColNames.includes('address')) { extraInsertCols.push('address'); if (docColNames.includes('clinic_location')) extraSelects.push('d.clinic_location'); else if (docColNames.includes('clinic_address')) extraSelects.push('d.clinic_address'); else extraSelects.push('NULL'); }
      if (clinicColNames.includes('schedule')) { extraInsertCols.push('schedule'); extraSelects.push('NULL'); }
      if (clinicColNames.includes('created_at')) { extraInsertCols.push('created_at'); extraSelects.push('NOW()'); }
      if (extraInsertCols.length > 0) {
        const conds = [];
        if (docColNames.includes('clinic_location')) conds.push('d.clinic_location IS NOT NULL');
        if (docColNames.includes('clinic_address')) conds.push('d.clinic_address IS NOT NULL');
        if (conds.length) {
          let condExpr = `(${conds.join(' OR ')})`;
          if (docColNames.includes('clinic_id')) condExpr += ` AND (d.clinic_id IS NULL OR d.clinic_id = 0)`;
          if (docColNames.includes('clinic_schedule')) condExpr += ` AND ((d.clinic_schedule IS NULL OR d.clinic_schedule = ''))`;
          const extraSql = `INSERT INTO clinics (${extraInsertCols.join(',')}) SELECT ${extraSelects.join(',')} FROM doctors d WHERE ${condExpr}`;
          await conn.query(extraSql);
        } else {
          console.log('No doctor location/address columns present; skipping extra inserts');
        }
      }
    }

    // 5) drop doctors.clinic_schedule and doctors.clinic_location if exists
    const [docColSched] = await conn.query("SHOW COLUMNS FROM doctors LIKE 'clinic_schedule'");
    if (docColSched && docColSched.length) {
      console.log('Dropping doctors.clinic_schedule column');
      await conn.query('ALTER TABLE doctors DROP COLUMN clinic_schedule');
    } else {
      console.log('doctors.clinic_schedule not present');
    }
    const [docColLoc] = await conn.query("SHOW COLUMNS FROM doctors LIKE 'clinic_location'");
    if (docColLoc && docColLoc.length) {
      console.log('Dropping doctors.clinic_location column');
      await conn.query('ALTER TABLE doctors DROP COLUMN clinic_location');
    } else {
      console.log('doctors.clinic_location not present');
    }

    await conn.commit();
    console.log('Manual migration completed successfully');
  } catch (e) {
    console.error('Manual migration failed:', e && e.message ? e.message : e);
    try { await conn.rollback(); } catch (_){ }
    process.exitCode = 1;
  } finally {
    conn.release();
    try { await pool.end(); } catch (_) {}
  }
})();
