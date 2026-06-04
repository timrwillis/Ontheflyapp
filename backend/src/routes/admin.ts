import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';
import { isAdminUser } from '../lib/admin.js';

export function registerAdminRoutes(app: App, fastify: FastifyInstance) {
  const errorSchema = { type: 'object', properties: { error: { type: 'string' } } };

  // ── Helper: resolve authed user from request ─────────────────────────────
  async function getSessionUser(request: any) {
    const headers = new Headers();
    Object.entries(request.headers as Record<string, unknown>).forEach(([key, value]) => {
      if (value) headers.append(key, Array.isArray(value) ? value[0] : String(value));
    });
    const session = await app.auth.api.getSession({ headers });
    if (!session?.user?.id) return null;
    const user = await app.db.query.users.findFirst({
      where: eq(schema.users.email, session.user.email),
    });
    return user ?? null;
  }

  // ── GET /api/admin/stats ──────────────────────────────────────────────────
  fastify.get(
    '/api/admin/stats',
    {
      schema: {
        description: 'Get admin statistics',
        tags: ['admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              total_users: { type: 'integer' },
              total_workers: { type: 'integer' },
              total_businesses: { type: 'integer' },
              total_shifts: { type: 'integer' },
              open_shifts: { type: 'integer' },
              filled_shifts: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      app.logger.info({}, 'Getting admin stats');

      const allUsers = await app.db.select().from(schema.users);
      const totalUsers = allUsers.length;
      const totalWorkers = allUsers.filter((u) => u.role === 'worker').length;

      const businesses = await app.db.select().from(schema.businesses);
      const totalBusinesses = businesses.length;

      const shifts = await app.db.select().from(schema.shifts);
      const totalShifts = shifts.length;
      const openShifts = shifts.filter((s) => s.status === 'open').length;
      const filledShifts = shifts.filter((s) => s.status === 'filled').length;

      const stats = {
        total_users: totalUsers,
        total_workers: totalWorkers,
        total_businesses: totalBusinesses,
        total_shifts: totalShifts,
        open_shifts: openShifts,
        filled_shifts: filledShifts,
      };

      app.logger.info(stats, 'Admin stats retrieved');
      return stats;
    }
  );

  // ── Helper: seed a demo business + manager profile for a user ───────────────
  async function seedDemoBusiness(userId: string): Promise<{ businessId: string; seeded: boolean }> {
    let existingBiz = await app.db.query.businesses.findFirst({
      where: eq(schema.businesses.userId, userId),
    });

    let businessId: string;
    let seeded = false;

    if (!existingBiz) {
      businessId = `biz-demo-${Date.now()}`;
      await app.db.insert(schema.businesses).values({
        id: businessId,
        userId,
        name: 'Demo Restaurant',
        type: 'restaurant',
        city: 'Kansas City',
        address: '1200 Main St',
        phone: '816-555-0100',
        isVerified: true,
        isSuspended: false,
        createdAt: new Date(),
      });
      app.logger.info({ userId, businessId }, '[Admin] Demo business created');
      seeded = true;
    } else {
      businessId = existingBiz.id;
      app.logger.info({ userId, businessId }, '[Admin] Demo business already exists — skipping');
    }

    const mp = await app.db.query.managerProfiles.findFirst({
      where: eq(schema.managerProfiles.userId, userId),
    });

    if (!mp) {
      const mpId = `mp-demo-${Date.now()}`;
      await app.db.insert(schema.managerProfiles).values({
        id: mpId,
        userId,
        businessId,
        isVerified: true,
        isSuspended: false,
        onboardingCompleted: true,
        createdAt: new Date(),
      });
      app.logger.info({ userId, mpId }, '[Admin] Demo manager profile created');
      seeded = true;
    } else if (!mp.businessId) {
      await app.db
        .update(schema.managerProfiles)
        .set({ businessId, onboardingCompleted: true })
        .where(eq(schema.managerProfiles.id, mp.id));
      app.logger.info({ userId, mpId: mp.id, businessId }, '[Admin] Manager profile linked to demo business');
      seeded = true;
    }

    return { businessId, seeded };
  }

  // ── POST /api/admin/force-complete-onboarding ─────────────────────────────
  fastify.post(
    '/api/admin/force-complete-onboarding',
    {
      schema: {
        description: 'Admin: force-complete onboarding for the current user',
        tags: ['admin'],
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' } },
          },
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await getSessionUser(request);
      if (!user) return reply.status(401 as any).send({ error: 'Unauthorized' });

      if (!isAdminUser({ email: user.email, isAdmin: user.isAdmin })) {
        app.logger.warn({ email: user.email }, 'Non-admin tried force-complete-onboarding');
        return reply.status(403).send({ error: 'Forbidden: admin only' });
      }

      app.logger.info({ userId: user.id }, 'Admin force-completing onboarding');

      await app.db
        .update(schema.users)
        .set({ onboardingStep: 4, profileCompleted: true })
        .where(eq(schema.users.id, user.id));

      if (user.role === 'worker') {
        const wp = await app.db.query.workerProfiles.findFirst({
          where: eq(schema.workerProfiles.userId, user.id),
        });
        if (wp) {
          await app.db
            .update(schema.workerProfiles)
            .set({ onboardingCompleted: true })
            .where(eq(schema.workerProfiles.id, wp.id));
        }
      } else if (user.role === 'manager') {
        await seedDemoBusiness(user.id);
        const mp = await app.db.query.managerProfiles.findFirst({
          where: eq(schema.managerProfiles.userId, user.id),
        });
        if (mp) {
          await app.db
            .update(schema.managerProfiles)
            .set({ onboardingCompleted: true })
            .where(eq(schema.managerProfiles.id, mp.id));
        }
      }

      app.logger.info({ userId: user.id, role: user.role }, 'Force-complete onboarding done');
      return { success: true };
    }
  );

  // ── POST /api/admin/seed-demo-business ────────────────────────────────────
  fastify.post(
    '/api/admin/seed-demo-business',
    {
      schema: {
        description: 'Admin: seed a demo business profile if one does not exist',
        tags: ['admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              businessId: { type: 'string' },
              seeded: { type: 'boolean' },
            },
          },
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await getSessionUser(request);
      if (!user) return reply.status(401 as any).send({ error: 'Unauthorized' });

      if (!isAdminUser({ email: user.email, isAdmin: user.isAdmin })) {
        app.logger.warn({ email: user.email }, 'Non-admin tried seed-demo-business');
        return reply.status(403).send({ error: 'Forbidden: admin only' });
      }

      app.logger.info({ userId: user.id }, 'Admin seeding demo business profile');
      const result = await seedDemoBusiness(user.id);
      app.logger.info({ userId: user.id, ...result }, 'Demo business seed complete');
      return { success: true, ...result };
    }
  );

  // ── DELETE /api/admin/delete-user-by-email ────────────────────────────────
  // Cleanup tool for smoke tests — deletes a user and all cascaded rows.
  fastify.delete(
    '/api/admin/delete-user-by-email',
    {
      schema: {
        description: 'Admin: delete a user and all associated data by email (smoke test cleanup)',
        tags: ['admin'],
        body: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, email: { type: 'string' } },
          },
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const admin = await getSessionUser(request);
      if (!admin) return reply.status(401 as any).send({ error: 'Unauthorized' });

      if (!isAdminUser({ email: admin.email, isAdmin: admin.isAdmin })) {
        app.logger.warn({ email: admin.email }, 'Non-admin tried delete-user-by-email');
        return reply.status(403).send({ error: 'Forbidden: admin only' });
      }

      const { email } = request.body as { email: string };
      app.logger.info({ email }, '[Admin] Deleting user by email');

      // Delete from app users table — cascades to worker/manager profiles, businesses, etc.
      const appUser = await app.db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });
      if (appUser) {
        await app.db.delete(schema.users).where(eq(schema.users.id, appUser.id));
        app.logger.info({ email, userId: appUser.id }, '[Admin] App user deleted');
      }

      // Delete from better-auth user table — cascades to sessions and accounts.
      // Drizzle merges appSchema + authSchema, so auth `user` table is at db.query.user
      const authUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });
      if (authUser) {
        await app.db.delete(authSchema.user).where(eq(authSchema.user.id, authUser.id));
        app.logger.info({ email, authId: authUser.id }, '[Admin] Auth user deleted');
      }

      if (!appUser && !authUser) {
        return reply.status(404).send({ error: `User not found: ${email}` });
      }

      return { success: true, email };
    }
  );
}
