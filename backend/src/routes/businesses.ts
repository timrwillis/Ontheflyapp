import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerBusinessRoutes(app: App, fastify: FastifyInstance) {
  fastify.get(
    '/api/businesses',
    {
      schema: {
        description: 'Get all businesses or businesses for a user',
        tags: ['businesses'],
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
              businesses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    city: { type: 'string' },
                    address: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
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
      const { user_id } = request.query as { user_id?: string };

      app.logger.info({ user_id }, 'Getting businesses');

      if (user_id) {
        const user = await app.db.query.users.findFirst({
          where: eq(schema.users.id, user_id),
        });

        if (!user) {
          app.logger.warn({ user_id }, 'User not found');
          return reply.status(404).send({ error: 'User not found' });
        }

        if (user.role === 'admin') {
          const businesses = await app.db.select().from(schema.businesses);
          app.logger.info({ count: businesses.length }, 'Returned all businesses for admin');
          return { businesses };
        } else if (user.role === 'manager') {
          const businesses = await app.db
            .select()
            .from(schema.businesses)
            .where(eq(schema.businesses.userId, user_id));
          app.logger.info({ count: businesses.length, user_id }, 'Returned manager businesses');
          return { businesses };
        }
      }

      const businesses = await app.db.select().from(schema.businesses);
      app.logger.info({ count: businesses.length }, 'Returned all businesses');
      return { businesses };
    }
  );

  fastify.post(
    '/api/businesses',
    {
      schema: {
        description: 'Create a new business',
        tags: ['businesses'],
        body: {
          type: 'object',
          required: ['name', 'type', 'city', 'address'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['restaurant', 'bar', 'catering', 'venue'] },
            city: { type: 'string' },
            address: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              city: { type: 'string' },
              address: { type: 'string' },
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
      const { name, type, city, address } = request.body as {
        name: string;
        type: string;
        city: string;
        address: string;
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

      app.logger.info({ name, type, userId }, 'Creating business');

      const newId = `b-${Date.now()}`;
      const businessData = {
        id: newId,
        userId,
        name,
        type: type as any,
        city,
        address,
      };

      const [created] = await app.db.insert(schema.businesses).values(businessData).returning();

      app.logger.info({ businessId: created.id }, 'Business created');
      return reply.status(201).send(created);
    }
  );

  fastify.get(
    '/api/businesses/:id',
    {
      schema: {
        description: 'Get a business by ID',
        tags: ['businesses'],
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
              userId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              city: { type: 'string' },
              address: { type: 'string' },
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
      const { id } = request.params as { id: string };

      app.logger.info({ id }, 'Getting business');

      const business = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, id),
      });

      if (!business) {
        app.logger.warn({ id }, 'Business not found');
        return reply.status(404).send({ error: 'Business not found' });
      }

      app.logger.info({ id }, 'Business retrieved');
      return business;
    }
  );
}
