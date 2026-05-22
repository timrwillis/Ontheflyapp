import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerOnboardingRoutes(app: App, fastify: FastifyInstance) {
  const errorSchema = { type: 'object', properties: { error: { type: 'string' } } };

  // POST /api/onboarding/role
  fastify.post(
    '/api/onboarding/role',
    {
      schema: {
        description: 'Set user role during onboarding',
        tags: ['onboarding'],
        body: { type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['manager', 'worker'] } } },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' }, role: { type: 'string' } } },
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const { role } = request.body as { role: string };
      app.logger.info({ userId: session.user.id, role }, 'Setting user role');

      // Check if user exists
      let user = await app.db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id),
      });

      if (!user) {
        // Auto-create user if doesn't exist
        app.logger.info({ userId: session.user.id }, 'User not found, creating in users table');
        const newUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'User',
          role: role as any,
          onboardingStep: 1,
          profileCompleted: false,
          notificationPreferences: {
            shift_alerts: true,
            application_updates: true,
            reminders: true,
            marketing: false,
          },
        };
        await app.db.insert(schema.users).values(newUser);
      } else {
        // Update existing user
        await app.db.update(schema.users).set({ role: role as any, onboardingStep: 1 }).where(eq(schema.users.id, session.user.id));
      }

      app.logger.info({ userId: session.user.id, role }, 'User role set');
      return { success: true, role };
    }
  );

  // POST /api/onboarding/worker
  fastify.post(
    '/api/onboarding/worker',
    {
      schema: {
        description: 'Create/update worker profile during onboarding',
        tags: ['onboarding'],
        body: {
          type: 'object',
          required: ['name', 'phone', 'city'],
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            city: { type: 'string' },
            bio: { type: 'string' },
            hasTransportation: { type: 'boolean' },
            preferredRadiusMiles: { type: 'integer' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' }, workerProfile: { type: 'object' } } },
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const body = request.body as any;
      app.logger.info({ userId: session.user.id, name: body.name }, 'Creating worker profile');

      // Ensure user exists in app's users table
      let appUser = await app.db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id),
      });

      if (!appUser) {
        app.logger.info({ userId: session.user.id }, 'User not found, creating in users table');
        const newUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'User',
          role: 'worker' as const,
          onboardingStep: 0,
          profileCompleted: false,
          notificationPreferences: {
            shift_alerts: true,
            application_updates: true,
            reminders: true,
            marketing: false,
          },
        };
        await app.db.insert(schema.users).values(newUser);
      }

      const existing = await app.db.query.workerProfiles.findFirst({ where: eq(schema.workerProfiles.userId, session.user.id) });

      const profileId = existing?.id || `wp_${Date.now()}`;
      const values = {
        id: profileId,
        userId: session.user.id,
        name: body.name,
        phone: body.phone,
        city: body.city,
        bio: body.bio,
        hasTransportation: body.hasTransportation ?? false,
        preferredRadiusMiles: body.preferredRadiusMiles,
        onboardingCompleted: false,
      };

      if (existing) {
        await app.db.update(schema.workerProfiles).set(values).where(eq(schema.workerProfiles.id, profileId));
      } else {
        await app.db.insert(schema.workerProfiles).values(values);
      }

      await app.db.update(schema.users).set({ onboardingStep: 2, profileCompleted: true }).where(eq(schema.users.id, session.user.id));

      app.logger.info({ profileId }, 'Worker profile created/updated');
      return { success: true, workerProfile: values };
    }
  );

  // POST /api/onboarding/worker/roles
  fastify.post(
    '/api/onboarding/worker/roles',
    {
      schema: {
        description: 'Set worker roles during onboarding',
        tags: ['onboarding'],
        body: { type: 'object', required: ['roles'], properties: { roles: { type: 'array', items: { type: 'object' } } } },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const { roles } = request.body as { roles: any[] };
      const worker = await app.db.query.workerProfiles.findFirst({ where: eq(schema.workerProfiles.userId, session.user.id) });
      if (!worker) return reply.status(404).send({ error: 'Worker profile not found' });

      app.logger.info({ workerId: worker.id }, 'Setting worker roles');

      await app.db.delete(schema.workerRoles).where(eq(schema.workerRoles.workerId, worker.id));

      const roleInserts = roles.map((r, i) => ({
        id: `wr_${Date.now()}_${i}`,
        workerId: worker.id,
        role: r.role as any,
        yearsExperience: r.yearsExperience,
        isPrimary: r.isPrimary ?? (i === 0),
      }));

      await app.db.insert(schema.workerRoles).values(roleInserts);
      await app.db.update(schema.users).set({ onboardingStep: 3 }).where(eq(schema.users.id, session.user.id));

      app.logger.info({ count: roles.length }, 'Worker roles set');
      return { success: true };
    }
  );

  // POST /api/onboarding/worker/availability
  fastify.post(
    '/api/onboarding/worker/availability',
    {
      schema: {
        description: 'Set worker availability during onboarding',
        tags: ['onboarding'],
        body: {
          type: 'object',
          properties: {
            availabilityDays: { type: 'array', items: { type: 'string' } },
            availabilityStart: { type: 'string' },
            availabilityEnd: { type: 'string' },
            isAvailable: { type: 'boolean' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const body = request.body as any;
      app.logger.info({ userId: session.user.id }, 'Setting availability');

      await app.db.update(schema.workerProfiles).set({
        availabilityDays: body.availabilityDays,
        availabilityStart: body.availabilityStart,
        availabilityEnd: body.availabilityEnd,
        isAvailable: body.isAvailable ?? true,
      }).where(eq(schema.workerProfiles.userId, session.user.id));

      await app.db.update(schema.users).set({ onboardingStep: 4 }).where(eq(schema.users.id, session.user.id));

      app.logger.info({ userId: session.user.id }, 'Availability set');
      return { success: true };
    }
  );

  // POST /api/onboarding/manager
  fastify.post(
    '/api/onboarding/manager',
    {
      schema: {
        description: 'Create manager profile during onboarding',
        tags: ['onboarding'],
        body: { type: 'object', required: ['phone'], properties: { phone: { type: 'string' } } },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' }, managerProfile: { type: 'object' } } },
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const { phone } = request.body as { phone: string };

      // Ensure user exists in app's users table
      let appUser = await app.db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id),
      });

      if (!appUser) {
        app.logger.info({ userId: session.user.id }, 'User not found, creating in users table');
        const newUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'User',
          role: 'manager' as const,
          onboardingStep: 0,
          profileCompleted: false,
          notificationPreferences: {
            shift_alerts: true,
            application_updates: true,
            reminders: true,
            marketing: false,
          },
        };
        await app.db.insert(schema.users).values(newUser);
      }

      const existing = await app.db.query.managerProfiles.findFirst({ where: eq(schema.managerProfiles.userId, session.user.id) });

      const profileId = existing?.id || `mp_${Date.now()}`;
      const values = { id: profileId, userId: session.user.id, phone, onboardingCompleted: false };

      if (existing) {
        await app.db.update(schema.managerProfiles).set(values).where(eq(schema.managerProfiles.id, profileId));
      } else {
        await app.db.insert(schema.managerProfiles).values(values);
      }

      await app.db.update(schema.users).set({ onboardingStep: 2, profileCompleted: true }).where(eq(schema.users.id, session.user.id));

      return { success: true, managerProfile: values };
    }
  );

  // POST /api/onboarding/business
  fastify.post(
    '/api/onboarding/business',
    {
      schema: {
        description: 'Create/update business during onboarding',
        tags: ['onboarding'],
        body: {
          type: 'object',
          required: ['name', 'type', 'city', 'address'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            city: { type: 'string' },
            address: { type: 'string' },
            phone: { type: 'string' },
            description: { type: 'string' },
            website: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' }, business: { type: 'object' } } },
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const body = request.body as any;

      // Ensure user exists in app's users table
      let appUser = await app.db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id),
      });

      if (!appUser) {
        app.logger.info({ userId: session.user.id }, 'User not found, creating in users table');
        const newUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'User',
          role: 'manager' as const,
          onboardingStep: 0,
          profileCompleted: false,
          notificationPreferences: {
            shift_alerts: true,
            application_updates: true,
            reminders: true,
            marketing: false,
          },
        };
        await app.db.insert(schema.users).values(newUser);
      }

      const existing = await app.db.query.businesses.findFirst({ where: eq(schema.businesses.userId, session.user.id) });

      const businessId = existing?.id || `biz_${Date.now()}`;
      const values = {
        id: businessId,
        userId: session.user.id,
        name: body.name,
        type: body.type as any,
        city: body.city,
        address: body.address,
        phone: body.phone,
        description: body.description,
        website: body.website,
      };

      if (existing) {
        await app.db.update(schema.businesses).set(values).where(eq(schema.businesses.id, businessId));
      } else {
        await app.db.insert(schema.businesses).values(values);
      }

      const manager = await app.db.query.managerProfiles.findFirst({ where: eq(schema.managerProfiles.userId, session.user.id) });
      if (manager) {
        await app.db.update(schema.managerProfiles).set({ businessId }).where(eq(schema.managerProfiles.id, manager.id));
      }

      await app.db.update(schema.users).set({ onboardingStep: 3 }).where(eq(schema.users.id, session.user.id));

      return { success: true, business: values };
    }
  );

  // POST /api/onboarding/complete
  fastify.post(
    '/api/onboarding/complete',
    {
      schema: {
        description: 'Complete onboarding',
        tags: ['onboarding'],
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const user = await app.db.query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      app.logger.info({ userId: session.user.id, role: user.role }, 'Completing onboarding');

      // Update users table with profileCompleted and onboarding_step
      await app.db.update(schema.users).set({ profileCompleted: true, onboardingStep: 3 }).where(eq(schema.users.id, session.user.id));

      // Update profile table based on role
      if (user.role === 'worker') {
        await app.db.update(schema.workerProfiles).set({ onboardingCompleted: true }).where(eq(schema.workerProfiles.userId, session.user.id));
        app.logger.info({ userId: session.user.id }, 'Worker onboarding completed');
      } else if (user.role === 'manager') {
        await app.db.update(schema.managerProfiles).set({ onboardingCompleted: true }).where(eq(schema.managerProfiles.userId, session.user.id));
        app.logger.info({ userId: session.user.id }, 'Manager onboarding completed');
      }

      return { success: true };
    }
  );

  // GET /api/onboarding/status
  fastify.get(
    '/api/onboarding/status',
    {
      schema: {
        description: 'Get onboarding status',
        tags: ['onboarding'],
        response: {
          200: {
            type: 'object',
            properties: {
              onboarding_step: { type: 'string', enum: ['profile', 'roles', 'availability', 'complete'] },
              onboarding_completed: { type: 'boolean' },
              role: { type: 'string' },
            },
          },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers(Object.entries(request.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}));
      const session = await app.auth.api.getSession({ headers });
      if (!session) return reply.status(401).send({ error: 'Unauthorized' });

      const user = await app.db.query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      app.logger.info({ userId: session.user.id, role: user.role }, 'Getting onboarding status');

      // Map integer step to string label
      const stepMap: Record<number | null, string> = {
        0: 'profile',
        1: 'roles',
        2: 'availability',
        3: 'complete',
      };
      const onboardingStepLabel = stepMap[user.onboardingStep as any] || 'profile';

      // Check if onboarding is completed in profile tables
      let onboardingCompleted = false;
      if (user.role === 'worker') {
        const workerProfile = await app.db.query.workerProfiles.findFirst({
          where: eq(schema.workerProfiles.userId, session.user.id),
        });
        onboardingCompleted = workerProfile?.onboardingCompleted ?? false;
      } else if (user.role === 'manager') {
        const managerProfile = await app.db.query.managerProfiles.findFirst({
          where: eq(schema.managerProfiles.userId, session.user.id),
        });
        onboardingCompleted = managerProfile?.onboardingCompleted ?? false;
      }

      app.logger.info(
        { userId: session.user.id, onboardingStep: onboardingStepLabel, onboardingCompleted },
        'Onboarding status retrieved'
      );

      return {
        onboarding_step: onboardingCompleted ? 'complete' : onboardingStepLabel,
        onboarding_completed: onboardingCompleted,
        role: user.role,
      };
    }
  );
}
