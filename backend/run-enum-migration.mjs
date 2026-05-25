/**
 * One-shot migration: adds 'line_cook' and 'catering' to the worker_role enum.
 * Run from the backend/ folder:  node run-enum-migration.mjs
 *
 * Reads DATABASE_URL from .env automatically — no extra setup needed.
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Parse DATABASE_URL from .env (no dotenv dependency needed)
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) dbUrl = match[1].trim();
  } catch {}
}

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL not found in environment or .env file.');
  process.exit(1);
}

// Use the postgres package already in node_modules
const require = createRequire(import.meta.url);
const postgres = require('postgres');

const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

try {
  // Show current enum values
  const before = await sql`
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'worker_role'
    ORDER BY enumsortorder
  `;
  console.log('Current worker_role enum:', before.map(r => r.enumlabel).join(', '));

  // ADD VALUE must be separate statements; IF NOT EXISTS is safe to re-run
  await sql`ALTER TYPE "worker_role" ADD VALUE IF NOT EXISTS 'line_cook'`;
  console.log("✓ Added 'line_cook'");

  await sql`ALTER TYPE "worker_role" ADD VALUE IF NOT EXISTS 'catering'`;
  console.log("✓ Added 'catering'");

  const after = await sql`
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'worker_role'
    ORDER BY enumsortorder
  `;
  console.log('Updated worker_role enum:', after.map(r => r.enumlabel).join(', '));
  console.log('\n✅ Migration complete — Railway will pick up the enum automatically on next deploy.');
} catch (err) {
  console.error('Migration FAILED:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
