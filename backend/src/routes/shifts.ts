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
  // Helper function to get urgency priority for sorting
  function getUrgencyPriority(urgency: string): number {
    const priorities: { [key: string]: number } = {
      'emergency': 1,
      'tonight': 2,
      'high': 3,
      'tomorrow': 4,
      'this_week': 5,
      'medium': 6,
      'low': 7,
    };
    return priorities[urgency] || 8;
  }

  fastify.get(
    '/api/shifts',
    {
      schema: {
        description: 'Get shifts with filtering and sorting by urgency',
        tags: ['shifts'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            role: { type: 'string' },
            urgency: { type: 'string' },
            business_id: { type: 'string' },
            user_id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
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
      const { status, role, urgency, business_id: queryBusinessId, user_id: qsUserId } = request.query as {
        status?: string;
        role?: string;
        urgency?: string;
        business_id?: string;
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

      app.logger.info({ userId, status, role, urgency, business_id: queryBusinessId }, 'Getting shifts');

      let allShifts = await app.db.select().from(schema.shifts);

      // Apply filters
      if (status) {
        allShifts = allShifts.filter((s) => s.status === status);
      }

      if (role) {
        allShifts = allShifts.filter((s) => s.roleNeeded === role);
      }

      if (urgency) {
        allShifts = allShifts.filter((s) => s.urgency === urgency);
      }

      if (queryBusinessId) {
        allShifts = allShifts.filter((s) => s.businessId === queryBusinessId);
      }

      // Sort by urgency priority first, then by date
      allShifts.sort((a, b) => {
        const priorityA = getUrgencyPriority(a.urgency);
        const priorityB = getUrgencyPriority(b.urgency);
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.date.localeCompare(b.date);
      });

      // Enrich with business details
      const result = await Promise.all(
        allShifts.map(async (shift) => {
          const biz = await app.db.query.businesses.findFirst({
            where: eq(schema.businesses.id, shift.businessId),
          });
          return {
            id: shift.id,
            role: shift.roleNeeded,
            role_needed: shift.roleNeeded,
            business_name: biz?.name || '',
            business_type: biz?.type || '',
            business: biz ? {
              name: biz.name,
              type: biz.type,
              city: biz.city,
              address: biz.address,
            } : null,
            date: shift.date,
            start_time: shift.startTime,
            end_time: shift.endTime,
            hourly_pay: shift.hourlyPay,
            location: shift.location,
            dress_code: shift.dressCode,
            experience_required: shift.experienceRequired,
            certifications_required: shift.certificationsRequired || [],
            notes: shift.notes,
            urgency: shift.urgency,
            status: shift.status,
            workers_needed: shift.workersNeeded,
            workers_confirmed: shift.workersConfirmed,
          };
        })
      );

      app.logger.info({ count: result.length }, 'Shifts retrieved');
      return result;
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
            urgency: { type: 'string', enum: ['emergency', 'tonight', 'high', 'tomorrow', 'this_week', 'medium', 'low'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              businessId: { type: 'string' },
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
              urgency: { type: 'string' },
              status: { type: 'string' },
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
      const shiftData = {
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
        createdAt: new Date(),
      };

      await app.db.insert(schema.shifts).values(shiftData);

      app.logger.info({ shiftId: shiftData.id }, 'Shift created');
      return reply.status(201).send(shiftData);
    }
  );

  fastify.get(
    '/api/shifts/:id',
    {
      schema: {
        description: 'Get a shift by ID with rich business details',
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
            additionalProperties: true,
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

      const biz = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift.businessId),
      });

      app.logger.info({ id }, 'Shift retrieved');
      return {
        id: shift.id,
        role: shift.roleNeeded,
        role_needed: shift.roleNeeded,
        business_name: biz?.name || '',
        business_type: biz?.type || '',
        business: biz ? {
          name: biz.name,
          type: biz.type,
          city: biz.city,
          address: biz.address,
        } : null,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        hourly_pay: shift.hourlyPay,
        location: shift.location,
        dress_code: shift.dressCode,
        experience_required: shift.experienceRequired,
        certifications_required: shift.certificationsRequired || [],
        notes: shift.notes,
        urgency: shift.urgency,
        status: shift.status,
        workers_needed: shift.workersNeeded,
        workers_confirmed: shift.workersConfirmed,
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
            properties: {
              id: { type: 'string' },
              businessId: { type: 'string' },
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
              urgency: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              business: { type: 'object' },
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
      const { status } = request.body as { status: string };

      app.logger.info({ id, status }, 'Updating shift status');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, id),
      });

      if (!shift) {
        app.logger.warn({ id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      await app.db
        .update(schema.shifts)
        .set({ status: status as any })
        .where(eq(schema.shifts.id, id));

      const updated = { ...shift, status: status as any };

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, updated.businessId),
      });

      app.logger.info({ id, status }, 'Shift status updated');
      return { ...updated, business, business_name: business?.name || null, business_type: business?.type || null };
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
      const applicationData = {
        id: newAppId,
        shiftId: id,
        workerId: worker.id,
        status: 'pending' as const,
        appliedAt: new Date(),
        confirmedAt: null as any,
      };

      await app.db
        .insert(schema.shiftApplications)
        .values(applicationData);

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
            read: false,
            shiftId: id,
            createdAt: new Date(),
          });
      }

      app.logger.info({ applicationId: applicationData.id }, 'Application created');
      return reply.status(201).send(applicationData);
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
                items: { type: 'object', additionalProperties: true },
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
