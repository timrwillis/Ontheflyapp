import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerAdminRoutes(app: App, fastify: FastifyInstance) {
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
}
