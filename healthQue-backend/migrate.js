const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      run_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getApplied() {
  const [rows] = await pool.query('SELECT name FROM migrations');
  return new Set(rows.map(r => r.name));
}

async function applyMigration(filePath) {
  const name = path.basename(filePath);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log('Applying', name);
  // remove SQL comment lines that start with --, then split into statements
  const cleaned = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  await pool.query('INSERT INTO migrations (name) VALUES (?)', [name]);
}

async function run() {
  try {
    await ensureMigrationsTable();
    const applied = await getApplied();
    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (!applied.has(f)) {
        await applyMigration(path.join(dir, f));
      }
    }
    console.log('Migrations complete');
    process.exit(0);
  } catch (e) {
    console.error('Migration error', e);
    process.exit(1);
  }
}

if (require.main === module) run();
