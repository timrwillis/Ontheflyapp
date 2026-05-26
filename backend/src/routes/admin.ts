import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';
import { isAdminUser } from '../lib/admin.js';

export function registerAdminRoutes(app: App, fastify: FastifyInstance) {
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
    // Check if user already has a business
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

    // Ensure managerProfile exists and is linked to this business
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
            properties: {
              success: { type: 'boolean' },
            },
          },
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
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

      // Mark user as fully onboarded
      await app.db
        .update(schema.users)
        .set({ onboardingStep: 4, profileCompleted: true })
        .where(eq(schema.users.id, user.id));

      // Mark worker/manager profile onboarding complete based on role
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
        // Also seed demo business so manager can post shifts immediately
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
          403: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
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
}
    }
  );
}
