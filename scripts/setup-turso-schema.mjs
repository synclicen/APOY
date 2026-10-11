// One-off script: apply the APOY schema to the Turso database.
import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';

const url = process.env.TURSO_DATABASE_URL || '';
const authToken = readFileSync('/tmp/turso_db_token.txt', 'utf8').trim();

const client = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    photo_count INTEGER NOT NULL DEFAULT 0,
    settings TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS export_history (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    created_at INTEGER NOT NULL,
    format TEXT NOT NULL,
    quality TEXT NOT NULL,
    photo_count INTEGER NOT NULL DEFAULT 0,
    file_size TEXT,
    destination TEXT,
    settings TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_history_created ON export_history(created_at DESC)`,
];

for (const sql of statements) {
  try {
    await client.execute(sql);
    console.log('OK:', sql.slice(0, 60).replace(/\n/g, ' '));
  } catch (e) {
    console.error('FAIL:', e.message);
  }
}

// Verify tables
const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('\nTables in DB:');
for (const row of res.rows) {
  console.log(' -', row.name);
}
process.exit(0);
