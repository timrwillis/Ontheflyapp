import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface RatingInput {
  shift_id: string;
  worker_id: string;
  score: number;
  comment?: string;
}

export function registerRatingRoutes(app: App, fastify: FastifyInstance) {
  fastify.post(
    '/api/ratings',
    {
      schema: {
        description: 'Create a rating for a worker',
        tags: ['ratings'],
        body: {
          type: 'object',
          required: ['shift_id', 'worker_id', 'score'],
          properties: {
            shift_id: { type: 'string' },
            worker_id: { type: 'string' },
            score: { type: 'integer' },
            comment: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              shiftId: { type: 'string' },
              workerId: { type: 'string' },
              managerId: { type: 'string' },
              score: { type: 'integer' },
              comment: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
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
      const body = request.body as RatingInput;

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
      app.logger.info({ shift_id: body.shift_id, worker_id: body.worker_id }, 'Creating rating');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, body.shift_id),
      });

      if (!shift) {
        app.logger.warn({ shift_id: body.shift_id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, body.worker_id),
      });

      if (!worker) {
        app.logger.warn({ worker_id: body.worker_id }, 'Worker not found');
        return reply.status(404).send({ error: 'Worker not found' });
      }

      const newId = `r-${Date.now()}`;
      const ratingData = {
        id: newId,
        shiftId: body.shift_id,
        workerId: body.worker_id,
        managerId: userId,
        score: body.score,
        comment: body.comment,
        createdAt: new Date(),
      };

      await app.db.insert(schema.ratings).values(ratingData);

      const allRatings = await app.db
        .select()
        .from(schema.ratings)
        .where(eq(schema.ratings.workerId, body.worker_id));

      const avgScore = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
      const reliabilityScore = Math.round(avgScore * 20);

      await app.db
        .update(schema.workerProfiles)
        .set({ reliabilityScore })
        .where(eq(schema.workerProfiles.id, body.worker_id));

      const notifId = `notif-${Date.now()}`;
      await app.db
        .insert(schema.notifications)
        .values({
          id: notifId,
          userId: worker.userId,
          title: 'New Rating Received',
          body: `You received a ${body.score}/5 rating for your recent shift`,
          type: 'rating' as const,
          read: false,
          createdAt: new Date(),
        });

      app.logger.info({ ratingId: ratingData.id }, 'Rating created');
      return reply.status(201).send(ratingData);
    }
  );

  fastify.get(
    '/api/ratings/worker/:worker_id',
    {
      schema: {
        description: 'Get all ratings for a worker',
        tags: ['ratings'],
        params: {
          type: 'object',
          required: ['worker_id'],
          properties: {
            worker_id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ratings: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { worker_id } = request.params as { worker_id: string };

      app.logger.info({ worker_id }, 'Getting worker ratings');

      const ratings = await app.db
        .select()
        .from(schema.ratings)
        .where(eq(schema.ratings.workerId, worker_id));

      app.logger.info({ count: ratings.length }, 'Worker ratings retrieved');
      return { ratings };
    }
  );
}
