import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

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
      const { available, role, limit: limitStr } = request.query as {
        available?: string;
        role?: string;
        limit?: string;
      };

      const limit = limitStr ? parseInt(limitStr, 10) : 20;

      app.logger.info({ available, role, limit }, 'Getting worker profiles');

      let workers = await app.db.select().from(schema.workerProfiles);

      // Filter by availability
      if (available === 'true') {
        workers = workers.filter((w) => w.isAvailable === true);
      }

      // Note: role filtering requires joining with workerRoles table
      // This would be implemented in a more advanced query

      // Sort: is_available DESC, reliability_score DESC
      workers.sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return b.isAvailable ? 1 : -1;
        }
        return b.reliabilityScore - a.reliabilityScore;
      });

      // Apply limit
      const result = workers.slice(0, limit);

      // Convert to camelCase
      const response = result.map(toCamelCase);

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
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
        },
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
        },
      },
    },
    async (request, reply) => {
      const body = request.body as WorkerProfileInput;
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
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
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
        querystring: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
        },
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

      // Log the invite details
      console.log(`Invite sent to: ${worker.name}`);
      if (shiftId) {
        console.log(`  Shift ID: ${shiftId}`);
      }
      if (message) {
        console.log(`  Message: ${message}`);
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
}
