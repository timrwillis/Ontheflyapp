import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const db = drizzle(neon(process.env.DATABASE_URL!));
const result = await db.execute(sql`SELECT unnest(enum_range(NULL::worker_role)) AS value`);
console.log('worker_role enum values:', result.rows);
const adminResult = await db.execute(sql`SELECT email, is_admin FROM users WHERE email = 'timrwillis@gmail.com'`);
console.log('admin user:', adminResult.rows);
process.exit(0);
