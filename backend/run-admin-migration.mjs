/**
 * One-shot admin migration script.
 * Usage: node run-admin-migration.mjs
 * Requires DATABASE_URL in environment (reads from backend/.env)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import postgres from 'postgres';

// Load .env manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const envPath = path.join(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — rely on environment variables already set
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  console.log('Running admin migration...');

  // 1. Add is_admin column if it doesn't exist
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL`;
  console.log('✓ Column is_admin added (or already existed)');

  // 2. Set is_admin=true for timrwillis@gmail.com
  const result = await sql`
    UPDATE "users"
    SET "is_admin" = true
    WHERE "email" = 'timrwillis@gmail.com'
    RETURNING id, email, is_admin
  `;
  if (result.length > 0) {
    console.log('✓ Admin user updated:', result[0]);
  } else {
    console.log('! No user found with email timrwillis@gmail.com (will be set on first login)');
  }

  // 3. Print all admin users
  const admins = await sql`SELECT id, email, is_admin FROM "users" WHERE "is_admin" = true`;
  console.log('Current admin users:', admins);

} catch (err) {
  console.error('Migration error:', err);
  process.exit(1);
} finally {
  await sql.end();
}
