import Fastify from 'fastify';
import cors from '@fastify/cors';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { fileURLToPath } from 'url';
import path from 'path';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { seedDatabase } from './db/seed.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerUserRoutes } from './routes/users.js';
import { registerBusinessRoutes } from './routes/businesses.js';
import { registerWorkerRoutes } from './routes/workers.js';
import { registerShiftRoutes } from './routes/shifts.js';
import { registerApplicationRoutes } from './routes/applications.js';
import { registerRatingRoutes } from './routes/ratings.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerMarketplaceRoutes } from './routes/marketplace.js';
import { registerWaitlistRoutes } from './routes/waitlist.js';

const schema = { ...appSchema, ...authSchema };

// ── Database ─────────────────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');

const client = postgres(databaseUrl, { max: 10 });
const db = drizzle(client, { schema });

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ['*'],
  plugins: [bearer()],
  ...(process.env.GOOGLE_CLIENT_ID ? {
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
  } : {}),
});

// ── Fastify ───────────────────────────────────────────────────────────────────
const fastify = Fastify({
  logger: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
});

await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// App context object passed to all route registrars and seed
export const app = {
  fastify,
  db,
  logger: fastify.log,
  auth,
};

export type App = typeof app;

// ── Better-auth HTTP handler ──────────────────────────────────────────────────
fastify.all('/api/auth/*', async (request, reply) => {
  const protocol = (request.headers['x-forwarded-proto'] as string) ?? request.protocol;
  const host = (request.headers['x-forwarded-host'] as string) ?? request.hostname;
  const url = `${protocol}://${host}${request.url}`;

  const webRequest = new Request(url, {
    method: request.method,
    headers: request.headers as Record<string, string>,
    body: ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : JSON.stringify(request.body),
  });

  const response = await auth.handler(webRequest);

  reply.status(response.status);
  response.headers.forEach((value: string, key: string) => {
    reply.header(key, value);
  });

  return reply.send(await response.text());
});

// ── Migrations ───────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../drizzle');
try {
  await migrate(db, { migrationsFolder });
  fastify.log.info('Database migrations applied');
} catch (err) {
  fastify.log.error({ err }, 'Migration failed — continuing startup');
}

// ── Seed ──────────────────────────────────────────────────────────────────────
await seedDatabase(app);

// ── Routes ────────────────────────────────────────────────────────────────────
registerOnboardingRoutes(app, fastify);
registerUserRoutes(app, fastify);
registerBusinessRoutes(app, fastify);
registerWorkerRoutes(app, fastify);
registerShiftRoutes(app, fastify);
registerApplicationRoutes(app, fastify);
registerRatingRoutes(app, fastify);
registerNotificationRoutes(app, fastify);
registerAdminRoutes(app, fastify);
registerMarketplaceRoutes(app, fastify);
registerWaitlistRoutes(app, fastify);

// ── Health ────────────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';
await fastify.listen({ port, host });
