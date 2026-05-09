import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerApplicationRoutes(app: App, fastify: FastifyInstance) {
  fastify.patch(
    '/api/applications/:id/confirm',
    {
      schema: {
        description: 'Confirm a shift application',
        tags: ['applications'],
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
              id: { type: 'string' },
              shiftId: { type: 'string' },
              workerId: { type: 'string' },
              status: { type: 'string' },
              appliedAt: { type: 'string', format: 'date-time' },
              confirmedAt: { type: ['string', 'null'], format: 'date-time' },
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
      const { id } = request.params as { id: string };

      app.logger.info({ id }, 'Confirming application');

      const application = await app.db.query.shiftApplications.findFirst({
        where: eq(schema.shiftApplications.id, id),
      });

      if (!application) {
        app.logger.warn({ id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const confirmedAt = new Date();
      await app.db
        .update(schema.shiftApplications)
        .set({
          status: 'confirmed' as const,
          confirmedAt,
        })
        .where(eq(schema.shiftApplications.id, id));

      const updated = { ...application, status: 'confirmed' as const, confirmedAt };

      await app.db
        .update(schema.shifts)
        .set({ status: 'filled' as const })
        .where(eq(schema.shifts.id, application.shiftId));

      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, application.workerId),
      });

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, application.shiftId),
      });

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift!.businessId),
      });

      if (worker && business) {
        const notifId = `notif-${Date.now()}`;
        await app.db
          .insert(schema.notifications)
          .values({
            id: notifId,
            userId: worker.userId,
            title: 'You got the shift!',
            body: `You have been confirmed for the ${shift!.roleNeeded} shift at ${business.name}`,
            type: 'worker_confirmed' as const,
            shiftId: application.shiftId,
          });
      }

      app.logger.info({ id }, 'Application confirmed');
      return updated;
    }
  );

  fastify.patch(
    '/api/applications/:id/reject',
    {
      schema: {
        description: 'Reject a shift application',
        tags: ['applications'],
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
              id: { type: 'string' },
              shiftId: { type: 'string' },
              workerId: { type: 'string' },
              status: { type: 'string' },
              appliedAt: { type: 'string', format: 'date-time' },
              confirmedAt: { type: ['string', 'null'], format: 'date-time' },
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
      const { id } = request.params as { id: string };

      app.logger.info({ id }, 'Rejecting application');

      const application = await app.db.query.shiftApplications.findFirst({
        where: eq(schema.shiftApplications.id, id),
      });

      if (!application) {
        app.logger.warn({ id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      await app.db
        .update(schema.shiftApplications)
        .set({ status: 'rejected' as const })
        .where(eq(schema.shiftApplications.id, id));

      const updated = { ...application, status: 'rejected' as const };

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

      app.logger.info({ id }, 'Application rejected');
      return updated;
    }
  );

  fastify.get(
    '/api/my-applications',
    {
      schema: {
        description: 'Get all applications for current worker',
        tags: ['applications'],
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
        },
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
      const { user_id: qsUserId } = request.query as { user_id?: string };

      // Try to get authenticated user
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      const userId = session?.user?.id || qsUserId || 'u-wrk-1';

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
          const business = await app.db.query.businesses.findFirst({
            where: eq(schema.businesses.id, shift!.businessId),
          });
          return {
            ...app_item,
            shift: {
              ...shift,
              business,
            },
          };
        })
      );

      app.logger.info({ count: applications.length }, 'My applications retrieved');
      return { applications: applicationsWithShifts };
    }
  );
}
