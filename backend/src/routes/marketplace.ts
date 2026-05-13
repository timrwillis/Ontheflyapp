import type { FastifyInstance } from 'fastify';
import { eq, inArray, gte, or } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerMarketplaceRoutes(app: App, fastify: FastifyInstance) {
  fastify.get(
    '/api/marketplace/stats',
    {
      schema: {
        description: 'Get public marketplace statistics',
        tags: ['marketplace'],
        response: {
          200: {
            type: 'object',
            properties: {
              workers_available: { type: 'number' },
              restaurants_hiring: { type: 'number' },
              shifts_filled_this_week: { type: 'number' },
              active_shifts: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      app.logger.info({}, 'Getting marketplace statistics');

      // Count available workers
      const availableWorkers = await app.db
        .select()
        .from(schema.workerProfiles)
        .where(eq(schema.workerProfiles.isAvailable, true));

      // Get businesses with open shifts
      const openShifts = await app.db
        .select()
        .from(schema.shifts)
        .where(eq(schema.shifts.status, 'open'));

      const uniqueBusinessIds = new Set(openShifts.map((s) => s.businessId));
      const restaurantsHiring = uniqueBusinessIds.size;

      // Count filled/completed shifts from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const filledShifts = await app.db
        .select()
        .from(schema.shifts)
        .where(
          or(
            eq(schema.shifts.status, 'filled'),
            eq(schema.shifts.status, 'completed')
          )
        );

      const filledThisWeek = filledShifts.filter(
        (s) => new Date(s.createdAt) >= sevenDaysAgo
      );

      // Count active shifts (open or pending)
      const allShifts = await app.db
        .select()
        .from(schema.shifts);

      const activeShifts = allShifts.filter(
        (s) => s.status === 'open' || s.status === 'pending'
      );

      app.logger.info(
        {
          workersAvailable: availableWorkers.length,
          restaurantsHiring,
          shiftsFilledThisWeek: filledThisWeek.length,
          activeShifts: activeShifts.length,
        },
        'Marketplace statistics retrieved'
      );

      return {
        workers_available: availableWorkers.length,
        restaurants_hiring: restaurantsHiring,
        shifts_filled_this_week: filledThisWeek.length,
        active_shifts: activeShifts.length,
      };
    }
  );
}
