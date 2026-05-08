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
  fastify.get(
    '/api/worker-profiles',
    {
      schema: {
        description: 'Get all worker profiles with optional filters',
        tags: ['workers'],
        querystring: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            role: { type: 'string' },
            is_available: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              workers: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { city, role, is_available } = request.query as {
        city?: string;
        role?: string;
        is_available?: boolean;
      };

      app.logger.info({ city, role, is_available }, 'Getting worker profiles');

      const workers = await app.db.select().from(schema.workerProfiles);
      let filtered = workers;

      if (city) {
        filtered = filtered.filter((w) => w.city === city);
      }

      if (role) {
        filtered = filtered.filter((w) => w.roles && w.roles.includes(role));
      }

      if (is_available !== undefined) {
        filtered = filtered.filter((w) => w.isAvailable === is_available);
      }

      app.logger.info({ count: filtered.length }, 'Worker profiles retrieved');
      return { workers: filtered };
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
      const [profile] = await app.db
        .insert(schema.workerProfiles)
        .values({
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
        })
        .returning();

      app.logger.info({ profileId: profile.id }, 'Worker profile created');
      return reply.status(201).send(profile);
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
      return profile;
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
}
