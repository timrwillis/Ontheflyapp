import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as authSchema from '../src/db/schema/auth-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const email = process.env.NEW_EMAIL;
const newPassword = process.env.NEW_PASSWORD;

if (!email) {
  console.error('NEW_EMAIL env var is required');
  process.exit(1);
}
if (!newPassword) {
  console.error('NEW_PASSWORD env var is required');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}

const db = drizzle(neon(process.env.DATABASE_URL), { schema: authSchema });

// Find the user by email
const userRow = await db.query.user.findFirst({
  where: eq(authSchema.user.email, email),
});

if (!userRow) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`Found user: ${userRow.email} (id: ${userRow.id})`);

// Hash the new password using better-auth's algorithm
const hash = await hashPassword(newPassword);

// Update the credential account for this user
const updated = await db
  .update(authSchema.account)
  .set({ password: hash, updatedAt: new Date() })
  .where(
    and(
      eq(authSchema.account.userId, userRow.id),
      eq(authSchema.account.providerId, 'credential'),
    ),
  )
  .returning();

if (updated.length === 0) {
  console.error(`No credential account found for user ${email}. They may use social login only.`);
  process.exit(1);
}

// Confirm by querying the user back
const confirmed = await db.query.user.findFirst({
  where: eq(authSchema.user.email, email),
});

console.log('\nPassword reset successful.');
console.log(`  email:      ${confirmed!.email}`);
console.log(`  updated_at: ${updated[0].updatedAt.toISOString()}`);

process.exit(0);
