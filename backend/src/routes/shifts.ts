import type { FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface ShiftInput {
  roleNeeded: string;
  workersNeeded?: number;
  date: string;
  startTime: string;
  endTime: string;
  hourlyPay: string;
  location: string;
  dressCode?: string;
  experienceRequired?: string;
  certificationsRequired?: string[];
  notes?: string;
  urgency: string;
}

export function registerShiftRoutes(app: App, fastify: FastifyInstance) {
  fastify.get(
    '/api/shifts',
    {
      schema: {
        description: 'Get shifts with filtering based on user role',
        tags: ['shifts'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            role: { type: 'string' },
            urgency: { type: 'string' },
            user_id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shifts: {
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
      const { status, role, urgency, user_id: qsUserId } = request.query as {
        status?: string;
        role?: string;
        urgency?: string;
        user_id?: string;
      };

      // Try to get authenticated user
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      const userId = session?.user?.id || qsUserId || 'u-mgr-1';

      app.logger.info({ userId, status, role, urgency }, 'Getting shifts');

      // Try to determine user role
      let userRole = 'worker'; // Default to worker for authenticated users

      // Check if user has a business (manager)
      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.userId, userId),
      });

      if (business) {
        userRole = 'manager';
      } else {
        // Check if user is a demo user with a role
        const demoUser = await app.db.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });
        if (demoUser) {
          userRole = demoUser.role;
        }
      }

      let allShifts = await app.db.select().from(schema.shifts);

      if (userRole === 'worker') {
        allShifts = allShifts.filter(
          (s) => s.status === 'open' || s.status === 'pending'
        );
      } else if (userRole === 'manager' && business) {
        allShifts = allShifts.filter((s) => s.businessId === business.id);
      }

      if (status) {
        allShifts = allShifts.filter((s) => s.status === status);
      }

      if (role) {
        allShifts = allShifts.filter((s) => s.roleNeeded === role);
      }

      if (urgency) {
        allShifts = allShifts.filter((s) => s.urgency === urgency);
      }

      const result = await Promise.all(
        allShifts.map(async (shift) => {
          const business = await app.db.query.businesses.findFirst({
            where: eq(schema.businesses.id, shift.businessId),
          });
          return {
            ...shift,
            business,
          };
        })
      );

      app.logger.info({ count: result.length }, 'Shifts retrieved');
      return { shifts: result };
    }
  );

  fastify.post(
    '/api/shifts',
    {
      schema: {
        description: 'Create a new shift',
        tags: ['shifts'],
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['roleNeeded', 'date', 'startTime', 'endTime', 'hourlyPay', 'location', 'urgency'],
          properties: {
            roleNeeded: { type: 'string' },
            workersNeeded: { type: 'integer' },
            date: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            hourlyPay: { type: 'string' },
            location: { type: 'string' },
            dressCode: { type: 'string' },
            experienceRequired: { type: 'string' },
            certificationsRequired: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            urgency: { type: 'string', enum: ['tonight', 'tomorrow', 'this_week', 'future'] },
          },
        },
        response: {
          201: {
            type: 'object',
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
      const body = request.body as ShiftInput;
      const { user_id: qsUserId } = request.query as { user_id?: string };

      // Try to get authenticated user
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      const userId = session?.user?.id || qsUserId || 'u-mgr-1';

      app.logger.info({ roleNeeded: body.roleNeeded, userId }, 'Creating shift');

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.userId, userId),
      });

      if (!business) {
        app.logger.warn({ userId }, 'Business not found');
        return reply.status(404).send({ error: 'Business not found' });
      }

      const newId = `s-${Date.now()}`;
      const [shift] = await app.db
        .insert(schema.shifts)
        .values({
          id: newId,
          businessId: business.id,
          roleNeeded: body.roleNeeded,
          workersNeeded: body.workersNeeded || 1,
          date: body.date,
          startTime: body.startTime,
          endTime: body.endTime,
          hourlyPay: body.hourlyPay,
          location: body.location,
          dressCode: body.dressCode,
          experienceRequired: body.experienceRequired,
          certificationsRequired: body.certificationsRequired || [],
          notes: body.notes,
          urgency: body.urgency as any,
          status: 'open' as const,
        })
        .returning();

      app.logger.info({ shiftId: shift.id }, 'Shift created');
      const response = {
        id: shift.id,
        businessId: shift.businessId,
        roleNeeded: shift.roleNeeded,
        workersNeeded: shift.workersNeeded,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        hourlyPay: shift.hourlyPay,
        location: shift.location,
        dressCode: shift.dressCode,
        experienceRequired: shift.experienceRequired,
        certificationsRequired: shift.certificationsRequired,
        notes: shift.notes,
        urgency: shift.urgency,
        status: shift.status,
        createdAt: shift.createdAt,
        business,
      };
      return reply.status(201).send(response);
    }
  );

  fastify.get(
    '/api/shifts/:id',
    {
      schema: {
        description: 'Get a shift by ID with applications',
        tags: ['shifts'],
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

      app.logger.info({ id }, 'Getting shift');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, id),
      });

      if (!shift) {
        app.logger.warn({ id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift.businessId),
      });

      const applications = await app.db
        .select()
        .from(schema.shiftApplications)
        .where(eq(schema.shiftApplications.shiftId, id));

      const applicationsWithWorkers = await Promise.all(
        applications.map(async (app_item) => {
          const worker = await app.db.query.workerProfiles.findFirst({
            where: eq(schema.workerProfiles.id, app_item.workerId),
          });
          return {
            ...app_item,
            worker,
          };
        })
      );

      app.logger.info({ id, appCount: applications.length }, 'Shift retrieved');
      return {
        ...shift,
        business,
        applications: applicationsWithWorkers,
      };
    }
  );

  fastify.patch(
    '/api/shifts/:id',
    {
      schema: {
        description: 'Update shift status',
        tags: ['shifts'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['open', 'pending', 'filled', 'completed', 'canceled', 'no_show'] },
          },
        },
        response: {
          200: {
            type: 'object',
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
      const { status } = request.body as { status: string };

      app.logger.info({ id, status }, 'Updating shift status');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, id),
      });

      if (!shift) {
        app.logger.warn({ id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const [updated] = await app.db
        .update(schema.shifts)
        .set({ status: status as any })
        .where(eq(schema.shifts.id, id))
        .returning();

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, updated.businessId),
      });

      app.logger.info({ id, status }, 'Shift status updated');
      return { ...updated, business };
    }
  );

  fastify.post(
    '/api/shifts/:id/apply',
    {
      schema: {
        description: 'Apply for a shift',
        tags: ['shifts'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
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

      app.logger.info({ shiftId: id, userId }, 'Applying for shift');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, id),
      });

      if (!shift) {
        app.logger.warn({ id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.userId, userId),
      });

      if (!worker) {
        app.logger.warn({ userId }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      const newAppId = `sa-${Date.now()}`;
      const [application] = await app.db
        .insert(schema.shiftApplications)
        .values({
          id: newAppId,
          shiftId: id,
          workerId: worker.id,
          status: 'pending' as const,
        })
        .returning();

      if (shift.status === 'open') {
        await app.db
          .update(schema.shifts)
          .set({ status: 'pending' as const })
          .where(eq(schema.shifts.id, id));
      }

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift.businessId),
      });

      if (business) {
        const notifId = `notif-${Date.now()}`;
        await app.db
          .insert(schema.notifications)
          .values({
            id: notifId,
            userId: business.userId,
            title: 'New Application Received',
            body: `${worker.name} applied for your ${shift.roleNeeded} shift`,
            type: 'shift_accepted' as const,
            shiftId: id,
          });
      }

      app.logger.info({ applicationId: application.id }, 'Application created');
      return reply.status(201).send(application);
    }
  );

  fastify.get(
    '/api/shifts/:id/applications',
    {
      schema: {
        description: 'Get all applications for a shift',
        tags: ['shifts'],
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
      const { id } = request.params as { id: string };

      app.logger.info({ id }, 'Getting shift applications');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, id),
      });

      if (!shift) {
        app.logger.warn({ id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      const applications = await app.db
        .select()
        .from(schema.shiftApplications)
        .where(eq(schema.shiftApplications.shiftId, id));

      const applicationsWithWorkers = await Promise.all(
        applications.map(async (app_item) => {
          const worker = await app.db.query.workerProfiles.findFirst({
            where: eq(schema.workerProfiles.id, app_item.workerId),
          });
          return {
            ...app_item,
            worker,
          };
        })
      );

      app.logger.info({ id, count: applications.length }, 'Shift applications retrieved');
      return { applications: applicationsWithWorkers };
    }
  );
}
