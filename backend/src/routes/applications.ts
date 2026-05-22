import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';
import { sendExpoPushNotification } from '../utils/pushNotification.js';

export function registerApplicationRoutes(app: App, fastify: FastifyInstance) {
  fastify.patch(
    '/api/applications/:id/confirm',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              application: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  confirmed_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      // Authenticate the request
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) {
        app.logger.warn({}, 'Unauthorized: No session');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userId = session.user.id;
      app.logger.info({ id, userId }, 'Confirming application');

      const application = await app.db.query.shiftApplications.findFirst({
        where: eq(schema.shiftApplications.id, id),
      });

      if (!application) {
        app.logger.warn({ id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      if (application.status === 'confirmed' || application.status === 'rejected') {
        app.logger.warn({ id, status: application.status }, 'Application already in terminal state');
        return reply.status(409).send({ error: 'Application already in terminal state' });
      }

      // Look up shift and verify authorization
      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, application.shiftId),
      });

      if (!shift) {
        app.logger.warn({ shiftId: application.shiftId }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift.businessId),
      });

      if (!business || business.userId !== userId) {
        app.logger.warn({ id, userId }, 'Forbidden: User does not own the business');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const confirmedAt = new Date();
      await app.db
        .update(schema.shiftApplications)
        .set({
          status: 'confirmed' as const,
          confirmedAt,
        })
        .where(eq(schema.shiftApplications.id, id));

      await app.db
        .update(schema.shifts)
        .set({ status: 'filled' as const })
        .where(eq(schema.shifts.id, application.shiftId));

      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.userId, application.workerId),
      });

      if (worker && shift && business) {
        const title = 'You got the shift!';
        const body = `You have been confirmed for the ${shift.roleNeeded} shift at ${business.name}`;

        const notifId = `notif-${Date.now()}`;
        await app.db
          .insert(schema.notifications)
          .values({
            id: notifId,
            userId: worker.userId,
            title,
            body,
            type: 'worker_confirmed' as const,
            read: false,
            shiftId: application.shiftId,
            createdAt: new Date(),
          });

        // Send Expo push notification if the worker has a registered token
        const workerUser = await app.db.query.users.findFirst({
          where: eq(schema.users.id, worker.userId),
        });
        const prefs = workerUser?.notificationPreferences as Record<string, unknown> | null;
        const pushToken = prefs?.push_token as string | undefined;
        if (pushToken) {
          await sendExpoPushNotification(pushToken, title, body, { shiftId: application.shiftId });
        }
      }

      app.logger.info({ id }, 'Application confirmed');
      return {
        success: true,
        application: {
          id: application.id,
          status: 'confirmed',
          confirmed_at: confirmedAt.toISOString(),
        },
      };
    }
  );

  fastify.patch(
    '/api/applications/:id/reject',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              application: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      // Authenticate the request
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) {
        app.logger.warn({}, 'Unauthorized: No session');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userId = session.user.id;
      app.logger.info({ id, userId }, 'Rejecting application');

      const application = await app.db.query.shiftApplications.findFirst({
        where: eq(schema.shiftApplications.id, id),
      });

      if (!application) {
        app.logger.warn({ id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      if (application.status === 'confirmed' || application.status === 'rejected') {
        app.logger.warn({ id, status: application.status }, 'Application already in terminal state');
        return reply.status(409).send({ error: 'Application already in terminal state' });
      }

      // Look up shift and verify authorization
      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, application.shiftId),
      });

      if (!shift) {
        app.logger.warn({ shiftId: application.shiftId }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift.businessId),
      });

      if (!business || business.userId !== userId) {
        app.logger.warn({ id, userId }, 'Forbidden: User does not own the business');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      await app.db
        .update(schema.shiftApplications)
        .set({ status: 'rejected' as const })
        .where(eq(schema.shiftApplications.id, id));

      const otherApplications = await app.db
        .select()
        .from(schema.shiftApplications)
        .where(eq(schema.shiftApplications.shiftId, application.shiftId));

      const hasActiveApps = otherApplications.some(
        (a) => (a.status === 'pending' || a.status === 'confirmed') && a.id !== id
      );

      if (!hasActiveApps) {
        await app.db
          .update(schema.shifts)
          .set({ status: 'open' as const })
          .where(eq(schema.shifts.id, application.shiftId));
      }

      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, application.workerId),
      });

      if (worker && shift && business) {
        const title = 'Application Not Selected';
        const body = `You were not selected for the ${shift.roleNeeded} shift at ${business.name}`;

        const notifId = `notif-${Date.now()}`;
        await app.db
          .insert(schema.notifications)
          .values({
            id: notifId,
            userId: worker.userId,
            title,
            body,
            type: 'cancellation' as const,
            read: false,
            shiftId: application.shiftId,
            createdAt: new Date(),
          });

        const workerUser = await app.db.query.users.findFirst({
          where: eq(schema.users.id, worker.userId),
        });
        const prefs = workerUser?.notificationPreferences as Record<string, unknown> | null;
        const pushToken = prefs?.push_token as string | undefined;
        if (pushToken) {
          await sendExpoPushNotification(pushToken, title, body, { shiftId: application.shiftId });
        }
      }

      app.logger.info({ id }, 'Application rejected');
      return {
        success: true,
        application: {
          id: application.id,
          status: 'rejected',
        },
      };
    }
  );

  fastify.get(
    '/api/my-applications',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              applications: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
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
      // Try to get authenticated user
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) {
        app.logger.warn({}, 'Unauthorized: No session');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userId = session.user.id;
      app.logger.info({ userId }, 'Getting my applications');

      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.userId, userId),
      });

      if (!worker) {
        app.logger.warn({ userId }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      const applications = await app.db
        .select()
        .from(schema.shiftApplications)
        .where(eq(schema.shiftApplications.workerId, worker.id));

      const applicationsWithShifts = await Promise.all(
        applications.map(async (app_item) => {
          const shift = await app.db.query.shifts.findFirst({
            where: eq(schema.shifts.id, app_item.shiftId),
          });
          const business = shift
            ? await app.db.query.businesses.findFirst({
                where: eq(schema.businesses.id, shift.businessId),
              })
            : null;
          return {
            ...app_item,
            shift: shift ? { ...shift, business } : null,
          };
        })
      );

      app.logger.info({ count: applications.length }, 'My applications retrieved');
      return { applications: applicationsWithShifts };
    }
  );
}
