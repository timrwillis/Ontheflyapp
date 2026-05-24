import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

const result = await db.execute(
  sql`SELECT unnest(enum_range(NULL::worker_role)) AS value`
);

console.log('worker_role enum values in Neon (production):');
const rows = (result as any).rows ?? result;
console.log('raw result type:', typeof result, Array.isArray(result) ? 'array' : 'not-array');
console.log('raw result keys:', Object.keys(result as any));
console.log('raw result:', JSON.stringify(result, null, 2));
