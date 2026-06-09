import type { FastifyInstance } from 'fastify';
import { eq, inArray, isNull, and, sql } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';
import { isAdminUser } from '../lib/admin.js';
import { sendExpoPushNotification } from '../utils/pushNotification.js';
import { fanOutRushShift, workerIsEligibleForShift } from '../services/rushFanOut.js';

interface ShiftInput {
  role: string;
  workers_needed?: number;
  date: string;
  start_time: string;
  end_time?: string;
  hourly_pay_cents: number;
  location?: string;
  dress_code?: string;
  experience_required?: string;
  certifications_required?: string[];
  notes?: string;
  urgency: string;
  is_rush?: boolean;
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
      const { status, role, urgency, business_id: queryBusinessId } = request.query as {
        status?: string;
        role?: string;
        urgency?: string;
        business_id?: string;
      };

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
            hourly_pay_cents: shift.hourlyPayCents,
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
        body: {
          type: 'object',
          required: ['role', 'date', 'start_time', 'hourly_pay_cents', 'urgency'],
          properties: {
            role: { type: 'string' },
            workers_needed: { type: 'integer' },
            date: { type: 'string' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            hourly_pay_cents: { type: 'integer' },
            location: { type: 'string' },
            dress_code: { type: 'string' },
            experience_required: { type: 'string' },
            certifications_required: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            urgency: { type: 'string', enum: ['emergency', 'tonight', 'high', 'tomorrow', 'this_week', 'medium', 'low'] },
            is_rush: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            additionalProperties: true,
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
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

      // Get authenticated user
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
      app.logger.info({ role: body.role, userId }, 'Creating shift');

      // Resolve admin status
      const dbUser = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      const adminUser = isAdminUser({ email: dbUser?.email, isAdmin: dbUser?.isAdmin });

      // Look up manager profile and business ID
      const managerProfile = await app.db.query.managerProfiles.findFirst({
        where: eq(schema.managerProfiles.userId, userId),
      });

      let businessIdToUse: string | null = null;

      if (!managerProfile || !managerProfile.businessId) {
        if (adminUser) {
          // Admin bypass: try to find any business for this user
          const anyBusiness = await app.db.query.businesses.findFirst({
            where: eq(schema.businesses.userId, userId),
          });
          if (!anyBusiness) {
            app.logger.warn({ userId }, '[Admin] No demo business found — seed one first');
            return reply.status(400).send({
              error: 'Admin: no business profile found. Long-press the Admin Pill → Seed demo business profile.',
            });
          }
          app.logger.info({ userId, businessId: anyBusiness.id }, '[Admin] Business profile gate bypassed for shift post');
          console.log(`[Admin] Business profile gate bypassed for shift post: ${userId}`);
          businessIdToUse = anyBusiness.id;
        } else {
          app.logger.warn({ userId }, 'Manager profile not found or business_id is missing');
          return reply.status(400).send({ error: 'Please complete your business profile before posting shifts.' });
        }
      } else {
        if (adminUser) {
          app.logger.info({ userId }, '[Admin] Business profile gate bypassed for shift post');
          console.log(`[Admin] Business profile gate bypassed for shift post: ${userId}`);
        }
        businessIdToUse = managerProfile.businessId;
      }

      // Narrow type: businessIdToUse is always set by this point (early returns cover null cases)
      const resolvedBusinessId: string = businessIdToUse as string;

      // Auto-detect rush if not explicitly provided: start within 4 hours
      let isRush = body.is_rush;
      if (isRush === undefined) {
        const shiftStart = new Date(`${body.date}T${body.start_time}:00`);
        const hoursUntil = (shiftStart.getTime() - Date.now()) / (1000 * 60 * 60);
        isRush = hoursUntil <= 4;
      }

      const newId = `s-${Date.now()}`;
      const shiftData = {
        id: newId,
        businessId: resolvedBusinessId,
        roleNeeded: body.role,
        workersNeeded: body.workers_needed || 1,
        workersConfirmed: 0,
        date: body.date,
        startTime: body.start_time,
        endTime: body.end_time || '',
        hourlyPayCents: body.hourly_pay_cents,
        location: body.location || '',
        dressCode: body.dress_code,
        experienceRequired: body.experience_required,
        certificationsRequired: body.certifications_required || [],
        notes: body.notes,
        urgency: body.urgency as any,
        status: 'open' as const,
        isRush,
        noShow: false,
        claimedAt: null,
        claimedByWorkerId: null,
        createdAt: new Date(),
      };

      try {
        await app.db.insert(schema.shifts).values(shiftData);
      } catch (err) {
        app.logger.error({ err, shiftData }, 'Failed to insert shift');
        return reply.status(500 as any).send({ error: 'Failed to create shift' });
      }

      app.logger.info({ shiftId: shiftData.id, businessId: resolvedBusinessId, isRush }, 'Shift created successfully');

      let pinnedWorkerCount = 0;
      if (isRush) {
        // Fire fan-out without blocking response; returns eligible worker count from DB
        pinnedWorkerCount = await fanOutRushShift(app, shiftData.id);
      }

      return reply.status(201).send({ shift: shiftData, pinged_worker_count: pinnedWorkerCount });
    }
  );

  fastify.get(
    '/api/shifts/my',
    {
      schema: {
        description: "Get shifts for the authenticated manager's business",
        tags: ['shifts'],
        response: {
          200: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
          },
          401: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
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
      app.logger.info({ userId }, 'Getting my shifts');

      const managerProfile = await app.db.query.managerProfiles.findFirst({
        where: eq(schema.managerProfiles.userId, userId),
      });

      if (!managerProfile?.businessId) {
        app.logger.warn({ userId }, 'Manager profile or business not found');
        return reply.status(404).send({ error: 'Business profile not found' });
      }

      const shifts = await app.db
        .select()
        .from(schema.shifts)
        .where(eq(schema.shifts.businessId, managerProfile.businessId));

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, managerProfile.businessId),
      });

      shifts.sort((a, b) => {
        const priorityA = getUrgencyPriority(a.urgency);
        const priorityB = getUrgencyPriority(b.urgency);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.date.localeCompare(b.date);
      });

      const result = await Promise.all(shifts.map(async (shift) => {
        let claimer: { id: string; name: string; reliability_score: number | null } | null = null;
        if (shift.claimedByWorkerId) {
          const workerProfile = await app.db.query.workerProfiles.findFirst({
            where: eq(schema.workerProfiles.id, shift.claimedByWorkerId),
          });
          if (workerProfile) {
            claimer = {
              id: workerProfile.id,
              name: workerProfile.name,
              reliability_score: workerProfile.reliabilityScore,
            };
          }
        }
        return {
          id: shift.id,
          role: shift.roleNeeded,
          role_needed: shift.roleNeeded,
          business_name: business?.name || '',
          business_type: business?.type || '',
          business: business ? {
            name: business.name,
            type: business.type,
            city: business.city,
            address: business.address,
          } : null,
          date: shift.date,
          start_time: shift.startTime,
          end_time: shift.endTime,
          hourly_pay_cents: shift.hourlyPayCents,
          location: shift.location,
          dress_code: shift.dressCode,
          experience_required: shift.experienceRequired,
          certifications_required: shift.certificationsRequired || [],
          notes: shift.notes,
          urgency: shift.urgency,
          status: shift.status,
          workers_needed: shift.workersNeeded,
          workers_confirmed: shift.workersConfirmed,
          claimed_by_worker_id: shift.claimedByWorkerId,
          claimer,
        };
      }));

      app.logger.info({ count: result.length, businessId: managerProfile.businessId }, 'My shifts retrieved');
      return result;
    }
  );

  // ── GET /api/shifts/rush-feed ─────────────────────────────────────────────
  // Must be registered before /:id so Fastify doesn't swallow "rush-feed" as a param
  fastify.get(
    '/api/shifts/rush-feed',
    {
      schema: {
        description: 'Get unclaimed rush shifts matching the current worker\'s role and availability',
        tags: ['shifts'],
        response: {
          200: { type: 'object', properties: { shifts: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userId = session.user.id;

      try {
        const workerProfile = await app.db.query.workerProfiles.findFirst({
          where: eq(schema.workerProfiles.userId, userId),
        });

        if (!workerProfile) {
          return reply.status(404).send({ error: 'Worker profile not found' });
        }

        const workerRoles = await app.db.query.workerRoles.findMany({
          where: eq(schema.workerRoles.workerId, workerProfile.id),
        });

        if (workerRoles.length === 0) {
          return { shifts: [] };
        }

        const workerRoleSet = new Set(workerRoles.map(r => r.role));
        const now = new Date();

        // Fetch all unclaimed rush shifts; filter in app code for time + availability
        const rushShifts = await app.db
          .select()
          .from(schema.shifts)
          .where(and(
            eq(schema.shifts.isRush, true),
            isNull(schema.shifts.claimedAt),
            eq(schema.shifts.status, 'open'),
          ));

        const matched = await Promise.all(
          rushShifts
            .filter(shift => {
              if (!workerRoleSet.has(shift.roleNeeded as any)) return false;
              const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`);
              if (shiftStart <= now) return false;
              const { eligible } = workerIsEligibleForShift(workerProfile, shiftStart, shift.startTime, now);
              return eligible;
            })
            .sort((a, b) => {
              const ta = new Date(`${a.date}T${a.startTime}:00`).getTime();
              const tb = new Date(`${b.date}T${b.startTime}:00`).getTime();
              return ta - tb;
            })
            .map(async shift => {
              const biz = await app.db.query.businesses.findFirst({
                where: eq(schema.businesses.id, shift.businessId),
              });
              return {
                id: shift.id,
                role: shift.roleNeeded,
                role_needed: shift.roleNeeded,
                business_name: biz?.name ?? '',
                business: biz ? { name: biz.name, type: biz.type, city: biz.city, address: biz.address } : null,
                date: shift.date,
                start_time: shift.startTime,
                end_time: shift.endTime,
                hourly_pay_cents: shift.hourlyPayCents,
                location: shift.location,
                urgency: shift.urgency,
                status: shift.status,
                is_rush: shift.isRush,
                claimed_at: shift.claimedAt,
              };
            }),
        );

        app.logger.info({ userId, count: matched.length }, '[RushFeed] shifts returned');
        return { shifts: matched };
      } catch (err) {
        app.logger.error({ err, userId }, '[RushFeed] Failed to fetch rush feed');
        return reply.status(500 as any).send({ error: 'Failed to fetch rush feed' });
      }
    },
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
        business_user_id: biz?.userId ?? null,
        business: biz ? {
          name: biz.name,
          type: biz.type,
          city: biz.city,
          address: biz.address,
        } : null,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        hourly_pay_cents: shift.hourlyPayCents,
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
              hourlyPayCents: { type: 'integer' },
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
      const { id } = request.params as { id: string };

      // Get authenticated user
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
        const title = 'New Application Received';
        const body = `${worker.name} applied for your ${shift.roleNeeded} shift`;

        const notifId = `notif-${Date.now()}`;
        await app.db
          .insert(schema.notifications)
          .values({
            id: notifId,
            userId: business.userId,
            title,
            body,
            type: 'shift_accepted' as const,
            read: false,
            shiftId: id,
            createdAt: new Date(),
          });

        const managerUser = await app.db.query.users.findFirst({
          where: eq(schema.users.id, business.userId),
        });
        const prefs = managerUser?.notificationPreferences as Record<string, unknown> | null;
        const pushToken = prefs?.push_token as string | undefined;
        if (pushToken) {
          await sendExpoPushNotification(pushToken, title, body, { shiftId: id });
        }
      }

      app.logger.info({ shiftId: id, workerId: worker.id, applicationId: applicationData.id }, '[Apply] shift status open→pending');
      console.log(`[Apply] shift=${id} worker=${worker.id} status=open→pending`);
      return reply.status(201).send(applicationData);
    }
  );

  // ── POST /api/shifts/:id/claim ────────────────────────────────────────────
  fastify.post(
    '/api/shifts/:id/claim',
    {
      schema: {
        description: 'Atomically claim a rush shift (first-tap-wins)',
        tags: ['shifts'],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          200: { type: 'object', additionalProperties: true },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const { id: shiftId } = request.params as { id: string };

      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

      const userId = session.user.id;

      try {
        const workerProfile = await app.db.query.workerProfiles.findFirst({
          where: eq(schema.workerProfiles.userId, userId),
        });
        if (!workerProfile) {
          return reply.status(404).send({ error: 'Worker profile not found' });
        }

        const shift = await app.db.query.shifts.findFirst({
          where: eq(schema.shifts.id, shiftId),
        });
        if (!shift) return reply.status(404).send({ error: 'Shift not found' });
        if (!shift.isRush) return reply.status(400 as any).send({ error: 'This shift is not a rush shift' });

        // Verify role match
        const workerRoles = await app.db.query.workerRoles.findMany({
          where: eq(schema.workerRoles.workerId, workerProfile.id),
        });
        const hasRole = workerRoles.some(r => r.role === shift.roleNeeded);
        if (!hasRole) {
          return reply.status(403).send({ error: `You do not have the required role: ${shift.roleNeeded}` });
        }

        // Verify availability
        const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`);
        const { eligible } = workerIsEligibleForShift(workerProfile, shiftStart, shift.startTime, new Date());
        if (!eligible) {
          return reply.status(403).send({ error: 'You are not available for this shift window' });
        }

        // Transaction: atomic UPDATE shifts + INSERT assignment + INSERT application
        // If any step fails the whole block rolls back.
        const now = new Date();
        const claimed = await app.db.transaction(async (tx) => {
          const [row] = await tx
            .update(schema.shifts)
            .set({
              claimedAt: now,
              claimedByWorkerId: workerProfile.id,
              status: 'filled' as const,
              workersConfirmed: sql<number>`${schema.shifts.workersConfirmed} + 1`,
            })
            .where(and(
              eq(schema.shifts.id, shiftId),
              isNull(schema.shifts.claimedAt),
              eq(schema.shifts.isRush, true),
              eq(schema.shifts.status, 'open'),
            ))
            .returning();

          if (!row) return undefined; // race loss — another worker claimed first

          await tx.insert(schema.shiftAssignments).values({
            id: `asgn-${Date.now()}`,
            shiftId,
            workerId: workerProfile.id,
          });

          await tx.insert(schema.shiftApplications).values({
            id: `appl-${Date.now()}`,
            shiftId,
            workerId: workerProfile.id,
            status: 'confirmed' as const,
            confirmedAt: now,
          });

          return row;
        });

        if (!claimed) {
          app.logger.info({ workerId: workerProfile.id, shiftId }, '[Claim] Race-loss for worker');
          console.log(`[Claim] Race-loss for worker ${workerProfile.id} on shift ${shiftId}`);
          return reply.status(409).send({ error: 'Already claimed by another worker' });
        }

        app.logger.info(
          { shiftId, workerId: workerProfile.id, workersConfirmed: claimed.workersConfirmed },
          '[Claim] shift=open→filled workers_confirmed updated',
        );
        console.log(`[Claim] shift=${shiftId} worker=${workerProfile.id} → filled, workers_confirmed=${claimed.workersConfirmed}`);

        // Notify the posting manager (fire and forget)
        const business = await app.db.query.businesses.findFirst({
          where: eq(schema.businesses.id, claimed.businessId),
        });
        if (business) {
          const managerUser = await app.db.query.users.findFirst({
            where: eq(schema.users.id, business.userId),
          });
          const managerTokens = await app.db.query.pushTokens.findMany({
            where: eq(schema.pushTokens.userId, business.userId),
          });
          // Also check legacy notificationPreferences.push_token
          const legacyToken = (managerUser?.notificationPreferences as Record<string, unknown> | null)?.push_token as string | undefined;

          const notifTitle = 'Rush shift claimed!';
          const notifBody = `${workerProfile.name} claimed your ${claimed.roleNeeded} shift.`;
          const notifData = { type: 'shift_claimed', shift_id: shiftId };

          for (const t of managerTokens) {
            sendExpoPushNotification(t.expoPushToken, notifTitle, notifBody, notifData);
          }
          if (legacyToken && !managerTokens.some(t => t.expoPushToken === legacyToken)) {
            sendExpoPushNotification(legacyToken, notifTitle, notifBody, notifData);
          }
        }

        return reply.status(200).send({
          shift: claimed,
          venue_info: business ? { name: business.name, address: business.address, city: business.city } : null,
        });
      } catch (err) {
        app.logger.error({ err, shiftId, userId }, '[Claim] Unexpected error');
        return reply.status(500 as any).send({ error: 'Failed to claim shift' });
      }
    },
  );

  // ── PATCH /api/shifts/:id/no-show ─────────────────────────────────────────
  fastify.patch(
    '/api/shifts/:id/no-show',
    {
      schema: {
        description: 'Manager: mark a shift as no-show (data collection only in v0.5)',
        tags: ['shifts'],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          200: { type: 'object', properties: { ok: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const { id: shiftId } = request.params as { id: string };

      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

      const userId = session.user.id;

      try {
        const shift = await app.db.query.shifts.findFirst({
          where: eq(schema.shifts.id, shiftId),
        });
        if (!shift) return reply.status(404).send({ error: 'Shift not found' });

        const business = await app.db.query.businesses.findFirst({
          where: eq(schema.businesses.id, shift.businessId),
        });
        if (!business || business.userId !== userId) {
          return reply.status(403).send({ error: 'Forbidden: you do not own this shift' });
        }

        await app.db
          .update(schema.shifts)
          .set({ noShow: true })
          .where(eq(schema.shifts.id, shiftId));

        app.logger.info({ shiftId, managerId: userId }, '[NoShow] Shift marked no_show by manager');
        console.log(`[NoShow] Shift ${shiftId} marked no_show by manager ${userId}`);
        return { ok: true };
      } catch (err) {
        app.logger.error({ err, shiftId, userId }, '[NoShow] Unexpected error');
        return reply.status(500 as any).send({ error: 'Failed to mark no-show' });
      }
    },
  );

  // ── DELETE /api/shifts/:id ────────────────────────────────────────────────
  fastify.delete(
    '/api/shifts/:id',
    {
      schema: {
        description: 'Delete a shift (owning manager or admin). Cascades applications and assignments.',
        tags: ['shifts'],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          204: { type: 'null' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const { id: shiftId } = request.params as { id: string };

      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
      });

      const session = await app.auth.api.getSession({ headers });
      if (!session?.user?.id) return reply.status(401).send({ error: 'Unauthorized' });

      const userId = session.user.id;

      try {
        const shift = await app.db.query.shifts.findFirst({
          where: eq(schema.shifts.id, shiftId),
        });
        if (!shift) {
          app.logger.info({ shiftId, userId }, '[Delete] Shift not found');
          return reply.status(404).send({ error: 'Shift not found' });
        }

        const dbUser = await app.db.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });
        const admin = isAdminUser({ email: dbUser?.email, isAdmin: dbUser?.isAdmin });

        if (!admin) {
          const business = await app.db.query.businesses.findFirst({
            where: eq(schema.businesses.id, shift.businessId),
          });
          if (!business || business.userId !== userId) {
            app.logger.info({ shiftId, userId }, '[Delete] Forbidden — user does not own this shift');
            return reply.status(403).send({ error: 'You do not have permission to delete this shift' });
          }
        }

        await app.db.delete(schema.shifts).where(eq(schema.shifts.id, shiftId));

        app.logger.info({ shiftId, userId }, '[Delete] Shift deleted');
        console.log(`[Delete] shift=${shiftId} deleted by user=${userId}`);
        return reply.status(204).send();
      } catch (err) {
        app.logger.error({ err, shiftId, userId }, '[Delete] Unexpected error');
        return reply.status(500 as any).send({ error: 'Failed to delete shift' });
      }
    },
  );

  fastify.get(
    '/api/shifts/:id/applications',
    {
      schema: {
        description: 'Get all applications for a shift (manager only)',
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
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    shift_id: { type: 'string' },
                    worker_id: { type: 'string' },
                    status: { type: 'string' },
                    applied_at: { type: 'string', format: 'date-time' },
                    worker: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        city: { type: 'string' },
                        reliability_score: { type: 'integer' },
                        is_available: { type: 'boolean' },
                        is_verified: { type: 'boolean' },
                        worker_roles: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              role: { type: 'string' },
                              years_experience: { type: ['integer', 'null'] },
                              is_primary: { type: 'boolean' },
                            },
                          },
                        },
                      },
                    },
                  },
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
        },
      },
    },
    async (request, reply) => {
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
      app.logger.info({ id, userId }, 'Getting shift applications');

      const shift = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, id),
      });

      if (!shift) {
        app.logger.warn({ id }, 'Shift not found');
        return reply.status(404).send({ error: 'Shift not found' });
      }

      // Verify authorization - user must own the business
      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, shift.businessId),
      });

      if (!business || business.userId !== userId) {
        app.logger.warn({ id, userId }, 'Forbidden: User does not own the business');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const applications = await app.db
        .select()
        .from(schema.shiftApplications)
        .where(eq(schema.shiftApplications.shiftId, id));

      const applicationsWithWorkers = await Promise.all(
        applications.map(async (app_item) => {
          const workerProfile = await app.db.query.workerProfiles.findFirst({
            where: eq(schema.workerProfiles.id, app_item.workerId),
          });

          let workerRoles: any[] = [];
          if (workerProfile) {
            workerRoles = await app.db
              .select()
              .from(schema.workerRoles)
              .where(eq(schema.workerRoles.workerId, workerProfile.id));
          }

          return {
            id: app_item.id,
            shift_id: app_item.shiftId,
            worker_id: app_item.workerId,
            status: app_item.status,
            applied_at: app_item.appliedAt?.toISOString(),
            worker: workerProfile ? {
              id: workerProfile.id,
              name: workerProfile.name,
              city: workerProfile.city,
              reliability_score: workerProfile.reliabilityScore,
              is_available: workerProfile.isAvailable,
              is_verified: workerProfile.isVerified,
              worker_roles: workerRoles.map((r) => ({
                role: r.role,
                years_experience: r.yearsExperience,
                is_primary: r.isPrimary,
              })),
            } : null,
          };
        })
      );

      app.logger.info({ id, count: applications.length }, 'Shift applications retrieved');
      return { applications: applicationsWithWorkers };
    }
  );
}

