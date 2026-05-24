import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';
import { haversineDistanceMiles, getCityCoords } from '../utils/haversine.js';

interface WorkerProfileInput {
  name: string;
  phone: string;
  city: string;
  roles?: string[];
  yearsExperience?: number;
  certifications?: string[];
  hasTransportation?: boolean;
  preferredRadiusMiles?: number;
  bio?: string;
  photoUrl?: string;
}

export function registerWorkerRoutes(app: App, fastify: FastifyInstance) {
  // Helper function to convert database record to camelCase
  function toCamelCase(worker: any) {
    return {
      id: worker.id,
      userId: worker.userId,
      name: worker.name,
      photoUrl: worker.photoUrl,
      phone: worker.phone,
      city: worker.city,
      bio: worker.bio,
      hasTransportation: worker.hasTransportation,
      preferredRadiusMiles: worker.preferredRadiusMiles,
      isAvailable: worker.isAvailable,
      reliabilityScore: worker.reliabilityScore,
      isVerified: worker.isVerified,
      isSuspended: worker.isSuspended,
      responseTimeMinutes: worker.responseTimeMinutes,
      distanceMiles: worker.distanceMiles,
      avgRating: worker.avgRating,
      createdAt: worker.createdAt,
    };
  }

  fastify.get(
    '/api/worker-profiles',
    {
      schema: {
        description: 'Get all worker profiles with optional filters',
        tags: ['workers'],
        querystring: {
          type: 'object',
          properties: {
            available: { type: 'string', enum: ['true', 'false'] },
            role: { type: 'string' },
            limit: { type: 'integer', default: 20 },
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { available, role, limit: limitStr, lat, lng } = request.query as {
        available?: string;
        role?: string;
        limit?: string;
        lat?: number;
        lng?: number;
      };

      const limit = limitStr ? parseInt(String(limitStr), 10) : 20;
      const requesterLat = lat != null ? Number(lat) : null;
      const requesterLng = lng != null ? Number(lng) : null;

      app.logger.info({ available, role, limit, requesterLat, requesterLng }, 'Getting worker profiles');

      let workers = await app.db.select().from(schema.workerProfiles);

      // Filter by availability
      if (available === 'true') {
        workers = workers.filter((w) => w.isAvailable === true);
      }

      // Sort: is_available DESC, reliability_score DESC
      workers.sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return b.isAvailable ? 1 : -1;
        }
        return b.reliabilityScore - a.reliabilityScore;
      });

      // Apply limit
      const result = workers.slice(0, limit);

      // Convert to camelCase and calculate distance when requester coords provided
      const response = result.map((worker) => {
        const base = toCamelCase(worker);
        if (requesterLat !== null && requesterLng !== null) {
          const workerCoords = getCityCoords(worker.city);
          if (workerCoords) {
            const miles = haversineDistanceMiles(requesterLat, requesterLng, workerCoords[0], workerCoords[1]);
            base.distanceMiles = parseFloat(miles.toFixed(1));
          }
        }
        return base;
      });

      app.logger.info({ count: response.length }, 'Worker profiles retrieved');
      return response;
    }
  );

  fastify.post(
    '/api/worker-profiles',
    {
      schema: {
        description: 'Create a new worker profile',
        tags: ['workers'],
        body: {
          type: 'object',
          required: ['name', 'phone', 'city'],
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            city: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            yearsExperience: { type: 'integer' },
            certifications: { type: 'array', items: { type: 'string' } },
            hasTransportation: { type: 'boolean' },
            preferredRadiusMiles: { type: 'integer' },
            bio: { type: 'string' },
            photoUrl: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              name: { type: 'string' },
              phone: { type: 'string' },
              city: { type: 'string' },
              roles: { type: 'array', items: { type: 'string' } },
              yearsExperience: { type: 'integer' },
              certifications: { type: 'array', items: { type: 'string' } },
              hasTransportation: { type: 'boolean' },
              preferredRadiusMiles: { type: 'integer' },
              bio: { type: 'string' },
              photoUrl: { type: 'string' },
              isAvailable: { type: 'boolean' },
              reliabilityScore: { type: 'integer' },
              isVerified: { type: 'boolean' },
              isSuspended: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
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
      const body = request.body as WorkerProfileInput;

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
      app.logger.info({ name: body.name, userId }, 'Creating worker profile');

      const newId = `wp-${Date.now()}`;
      const profileData = {
        id: newId,
        userId,
        name: body.name,
        phone: body.phone,
        city: body.city,
        roles: body.roles || [],
        yearsExperience: body.yearsExperience,
        certifications: body.certifications || [],
        hasTransportation: body.hasTransportation || false,
        preferredRadiusMiles: body.preferredRadiusMiles,
        bio: body.bio,
        photoUrl: body.photoUrl,
        isAvailable: false,
        reliabilityScore: 75,
        isVerified: false,
        isSuspended: false,
        createdAt: new Date(),
      };

      await app.db.insert(schema.workerProfiles).values(profileData);

      app.logger.info({ profileId: profileData.id }, 'Worker profile created');
      return reply.status(201).send(profileData);
    }
  );

  fastify.get(
    '/api/worker-profiles/me',
    {
      schema: {
        description: 'Get current worker profile',
        tags: ['workers'],
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
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
      app.logger.info({ userId }, 'Getting worker profile');

      const profile = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.userId, userId),
      });

      if (!profile) {
        app.logger.warn({ userId }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      app.logger.info({ profileId: profile.id }, 'Worker profile retrieved');
      return profile;
    }
  );

  fastify.put(
    '/api/worker-profiles/me',
    {
      schema: {
        description: 'Update current worker profile',
        tags: ['workers'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            city: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            yearsExperience: { type: 'integer' },
            certifications: { type: 'array', items: { type: 'string' } },
            hasTransportation: { type: 'boolean' },
            preferredRadiusMiles: { type: 'integer' },
            bio: { type: 'string' },
            photoUrl: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
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
      const body = request.body as Partial<WorkerProfileInput>;

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
      app.logger.info({ userId }, 'Updating worker profile');

      const profile = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.userId, userId),
      });

      if (!profile) {
        app.logger.warn({ userId }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      const updates: any = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.city !== undefined) updates.city = body.city;
      if (body.roles !== undefined) updates.roles = body.roles;
      if (body.yearsExperience !== undefined) updates.yearsExperience = body.yearsExperience;
      if (body.certifications !== undefined) updates.certifications = body.certifications;
      if (body.hasTransportation !== undefined) updates.hasTransportation = body.hasTransportation;
      if (body.preferredRadiusMiles !== undefined) updates.preferredRadiusMiles = body.preferredRadiusMiles;
      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl;

      const [updated] = await app.db
        .update(schema.workerProfiles)
        .set(updates)
        .where(eq(schema.workerProfiles.id, profile.id))
        .returning();

      app.logger.info({ profileId: profile.id }, 'Worker profile updated');
      return updated;
    }
  );

  fastify.get(
    '/api/worker-profiles/:id',
    {
      schema: {
        description: 'Get a worker profile by ID',
        tags: ['workers'],
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

      app.logger.info({ id }, 'Getting worker profile');

      const profile = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, id),
      });

      if (!profile) {
        app.logger.warn({ id }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      app.logger.info({ id }, 'Worker profile retrieved');
      return toCamelCase(profile);
    }
  );

  fastify.patch(
    '/api/worker-profiles/:id/availability',
    {
      schema: {
        description: 'Update worker availability',
        tags: ['workers'],
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
        body: {
          type: 'object',
          required: ['is_available'],
          properties: {
            is_available: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
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
      const { is_available } = request.body as { is_available: boolean };
      const { user_id } = request.query as { user_id?: string };

      app.logger.info({ id, is_available }, 'Updating availability');

      const profile = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, id),
      });

      if (!profile) {
        app.logger.warn({ id }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      if (user_id && profile.userId !== user_id) {
        app.logger.warn({ id, user_id }, 'Unauthorized');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const [updated] = await app.db
        .update(schema.workerProfiles)
        .set({ isAvailable: is_available })
        .where(eq(schema.workerProfiles.id, id))
        .returning();

      app.logger.info({ id, is_available }, 'Availability updated');
      return updated;
    }
  );

  fastify.patch(
    '/api/worker-profiles/:id/verify',
    {
      schema: {
        description: 'Verify a worker profile',
        tags: ['workers'],
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

      app.logger.info({ id }, 'Verifying worker profile');

      const profile = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, id),
      });

      if (!profile) {
        app.logger.warn({ id }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      const [updated] = await app.db
        .update(schema.workerProfiles)
        .set({ isVerified: true })
        .where(eq(schema.workerProfiles.id, id))
        .returning();

      app.logger.info({ id }, 'Worker profile verified');
      return updated;
    }
  );

  fastify.patch(
    '/api/worker-profiles/:id/suspend',
    {
      schema: {
        description: 'Suspend a worker profile',
        tags: ['workers'],
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

      app.logger.info({ id }, 'Suspending worker profile');

      const profile = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, id),
      });

      if (!profile) {
        app.logger.warn({ id }, 'Worker profile not found');
        return reply.status(404).send({ error: 'Worker profile not found' });
      }

      const [updated] = await app.db
        .update(schema.workerProfiles)
        .set({ isSuspended: true })
        .where(eq(schema.workerProfiles.id, id))
        .returning();

      app.logger.info({ id }, 'Worker profile suspended');
      return updated;
    }
  );

  fastify.post(
    '/api/worker-invites',
    {
      schema: {
        description: 'Send a worker invite (stub endpoint)',
        tags: ['workers'],
        body: {
          type: 'object',
          required: ['workerId'],
          properties: {
            workerId: { type: 'string' },
            shiftId: { type: 'string' },
            message: { type: 'string' },
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
      const { workerId, shiftId, message } = request.body as {
        workerId: string;
        shiftId?: string;
        message?: string;
      };

      app.logger.info({ workerId, shiftId, message }, 'Sending worker invite');

      // Look up the worker profile by workerId
      const worker = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, workerId),
      });

      if (!worker) {
        app.logger.warn({ workerId }, 'Worker not found');
        return reply.status(404).send({ error: 'Worker not found' });
      }

      app.logger.info(
        { workerId, workerName: worker.name, shiftId, message },
        'Worker invite sent successfully'
      );

      return {
        success: true,
        message: `Invite sent to ${worker.name}`,
      };
    }
  );

  // PATCH /api/worker-profiles/me - Update current worker profile (partial update)
  fastify.patch(
    '/api/worker-profiles/me',
    {
      schema: {
        description: 'Update current worker profile (partial update)',
        tags: ['workers'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            city: { type: 'string' },
            bio: { type: 'string' },
            has_transportation: { type: 'boolean' },
            preferred_radius_miles: { type: 'integer' },
            is_available: { type: 'boolean' },
            availability_days: { type: 'array', items: { type: 'string' } },
            availability_start: { type: 'string' },
            availability_end: { type: 'string' },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['bartender', 'server', 'cook', 'dishwasher', 'event_staff', 'security', 'barback', 'host', 'runner', 'busser'] },
                  years_experience: { type: 'integer' },
                  is_primary: { type: 'boolean' },
                },
              },
            },
            onboarding_step: { type: 'integer' },
          },
        },
        response: {
          200: {
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
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name?: string;
        phone?: string;
        city?: string;
        bio?: string;
        has_transportation?: boolean;
        preferred_radius_miles?: number;
        is_available?: boolean;
        availability_days?: string[];
        availability_start?: string;
        availability_end?: string;
        roles?: Array<{ role: string; years_experience?: number; is_primary?: boolean }>;
        onboarding_step?: number;
      };

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
      app.logger.info({ userId }, 'Patching worker profile');

      try {
        // Check if user exists in users table
        const user = await app.db.query.users.findFirst({
          where: eq(schema.users.id, userId),
        });

        if (!user) {
          app.logger.warn({ userId }, 'User not found in users table');
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Look up existing worker_profiles row
        let profile = await app.db.query.workerProfiles.findFirst({
          where: eq(schema.workerProfiles.userId, userId),
        });

        if (!profile) {
          // Insert new row with defaults
          const newId = `wp-${Date.now()}`;
          const insertData: any = {
            id: newId,
            userId,
            name: body.name || user.name || 'Worker',
            phone: body.phone || '',
            city: body.city || '',
            bio: body.bio,
            hasTransportation: body.has_transportation ?? false,
            preferredRadiusMiles: body.preferred_radius_miles,
            availabilityDays: body.availability_days,
            availabilityStart: body.availability_start,
            availabilityEnd: body.availability_end,
            isAvailable: body.is_available ?? false,
            reliabilityScore: 100,
            isVerified: false,
            isSuspended: false,
            onboardingCompleted: false,
          };

          const [inserted] = await app.db
            .insert(schema.workerProfiles)
            .values(insertData)
            .returning();

          profile = inserted;
          app.logger.info({ profileId: profile.id }, 'New worker profile created');
        } else {
          // Update existing row with only provided fields
          const updates: any = {};
          if (body.name !== undefined) updates.name = body.name;
          if (body.phone !== undefined) updates.phone = body.phone;
          if (body.city !== undefined) updates.city = body.city;
          if (body.bio !== undefined) updates.bio = body.bio;
          if (body.has_transportation !== undefined) updates.hasTransportation = body.has_transportation;
          if (body.preferred_radius_miles !== undefined) updates.preferredRadiusMiles = body.preferred_radius_miles;
          if (body.is_available !== undefined) updates.isAvailable = body.is_available;
          if (body.availability_days !== undefined) updates.availabilityDays = body.availability_days;
          if (body.availability_start !== undefined) updates.availabilityStart = body.availability_start;
          if (body.availability_end !== undefined) updates.availabilityEnd = body.availability_end;

          if (Object.keys(updates).length > 0) {
            const [updated] = await app.db
              .update(schema.workerProfiles)
              .set(updates)
              .where(eq(schema.workerProfiles.id, profile.id))
              .returning();

            profile = updated;
            app.logger.info({ profileId: profile.id }, 'Worker profile updated');
          }
        }

        // Handle roles array if provided
        if (body.roles !== undefined && body.roles !== null) {
          // Validate all role values
          const validRoles = ['bartender', 'server', 'cook', 'dishwasher', 'event_staff', 'security', 'barback', 'host', 'runner', 'busser'];
          for (const roleObj of body.roles) {
            if (!validRoles.includes(roleObj.role)) {
              app.logger.warn({ role: roleObj.role }, 'Invalid role value');
              return reply.status(400).send({ error: `Invalid role value: ${roleObj.role}` });
            }
          }

          // Delete all existing roles for this worker
          await app.db
            .delete(schema.workerRoles)
            .where(eq(schema.workerRoles.workerId, profile.id));

          // Insert new roles
          for (const roleObj of body.roles) {
            const roleId = `wr-${Date.now()}-${Math.random()}`;
            await app.db.insert(schema.workerRoles).values({
              id: roleId,
              workerId: profile.id,
              role: roleObj.role as any,
              yearsExperience: roleObj.years_experience,
              isPrimary: roleObj.is_primary ?? false,
            });
          }

          app.logger.info({ profileId: profile.id, rolesCount: body.roles.length }, 'Worker roles updated');
        }

        // Handle onboarding_step if provided
        if (body.onboarding_step !== undefined) {
          await app.db
            .update(schema.users)
            .set({ onboardingStep: body.onboarding_step })
            .where(eq(schema.users.id, userId));

          app.logger.info({ userId, onboardingStep: body.onboarding_step }, 'User onboarding step updated');
        }

        app.logger.info({ profileId: profile.id }, 'Worker profile patch completed');
        return reply.status(200).send(profile);
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to patch worker profile');
        return reply.status(500).send({ error: 'Failed to update worker profile' });
      }
    }
  );
}
