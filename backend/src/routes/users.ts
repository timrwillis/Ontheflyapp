import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function registerUserRoutes(app: App, fastify: FastifyInstance) {
  fastify.get(
    '/api/users/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['users'],
        querystring: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['manager', 'worker', 'admin'] },
            user_id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { role, user_id } = request.query as { role?: string; user_id?: string };

      app.logger.info({ role, user_id }, 'Getting user');

      // Try to get authenticated user from session
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });

      let user: any;

      if (session?.user) {
        // Return authenticated user from Better Auth
        app.logger.info({ userId: session.user.id }, 'Returning authenticated user');
        return session.user;
      }

      // Fall back to demo mode
      let userId: string;

      if (user_id) {
        userId = user_id;
      } else if (role === 'admin') {
        userId = 'u-admin-1';
      } else if (role === 'worker') {
        userId = 'u-wrk-1';
      } else {
        userId = 'u-mgr-1';
      }

      user = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user) {
        app.logger.warn({ userId }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      app.logger.info({ userId }, 'User retrieved');
      return user;
    }
  );

  fastify.post(
    '/api/users/switch-role',
    {
      schema: {
        description: 'Switch user role for demo purposes',
        tags: ['users'],
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['manager', 'worker', 'admin'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { role } = request.body as { role: string };

      app.logger.info({ role }, 'Switching role');

      let userId: string;

      if (role === 'admin') {
        userId = 'u-admin-1';
      } else if (role === 'worker') {
        userId = 'u-wrk-1';
      } else {
        userId = 'u-mgr-1';
      }

      const user = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user) {
        app.logger.warn({ userId }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      app.logger.info({ userId }, 'Role switched');
      return user;
    }
  );

  fastify.delete(
    '/api/users/me',
    {
      schema: {
        description: 'Delete a demo account (no auth required)',
        tags: ['users'],
        querystring: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['manager', 'worker', 'admin'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { role } = request.query as { role: string };

      app.logger.info({ role }, 'Deleting demo account');

      // Find the demo user by role
      const user = await app.db.query.users.findFirst({
        where: eq(schema.users.role, role as any),
      });

      if (!user) {
        app.logger.warn({ role }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      // Delete based on role
      if (role === 'worker') {
        app.logger.info({ userId: user.id }, 'Deleting worker profile and related data');

        // Get all worker profile IDs for this user
        const workerProfiles = await app.db
          .select()
          .from(schema.workerProfiles)
          .where(eq(schema.workerProfiles.userId, user.id));

        // Delete shift applications for all worker profiles
        for (const profile of workerProfiles) {
          await app.db
            .delete(schema.shiftApplications)
            .where(eq(schema.shiftApplications.workerId, profile.id));
        }

        // Delete worker profiles
        await app.db
          .delete(schema.workerProfiles)
          .where(eq(schema.workerProfiles.userId, user.id));

        // Delete notifications
        await app.db
          .delete(schema.notifications)
          .where(eq(schema.notifications.userId, user.id));
      } else if (role === 'manager') {
        app.logger.info({ userId: user.id }, 'Deleting manager business and related data');

        // Get all businesses for this user
        const businesses = await app.db
          .select()
          .from(schema.businesses)
          .where(eq(schema.businesses.userId, user.id));

        // For each business, delete shifts and cascade delete shift applications
        for (const business of businesses) {
          const shifts = await app.db
            .select()
            .from(schema.shifts)
            .where(eq(schema.shifts.businessId, business.id));

          for (const shift of shifts) {
            await app.db
              .delete(schema.shiftApplications)
              .where(eq(schema.shiftApplications.shiftId, shift.id));
          }

          await app.db
            .delete(schema.shifts)
            .where(eq(schema.shifts.businessId, business.id));
        }

        // Delete businesses
        await app.db
          .delete(schema.businesses)
          .where(eq(schema.businesses.userId, user.id));

        // Delete notifications
        await app.db
          .delete(schema.notifications)
          .where(eq(schema.notifications.userId, user.id));
      }
      // For admin, just delete the user (no cascading deletions needed)

      // Delete the user
      await app.db.delete(schema.users).where(eq(schema.users.id, user.id));

      app.logger.info({ userId: user.id, role }, 'Demo account deleted');
      return { success: true, message: 'Account deleted' };
    }
  );
}
