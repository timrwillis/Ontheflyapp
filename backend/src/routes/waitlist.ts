import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { nanoid } from 'nanoid';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

export function registerWaitlistRoutes(app: App, fastify: FastifyInstance) {
  const errorSchema = { type: 'object', properties: { error: { type: 'string' } } };

  // POST /api/waitlist - Public endpoint for waitlist signups
  fastify.post(
    '/api/waitlist',
    {
      schema: {
        description: 'Join the waitlist (public endpoint)',
        tags: ['waitlist'],
        body: {
          type: 'object',
          required: ['name', 'phone', 'email', 'role'],
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Successfully added to waitlist',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            description: 'Missing required fields',
            ...errorSchema,
          },
          500: {
            description: 'Failed to save signup',
            ...errorSchema,
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { name, phone, email, role } = request.body as {
        name?: string;
        phone?: string;
        email?: string;
        role?: string;
      };

      app.logger.info({ name, email, role }, 'Waitlist signup attempt');

      // Validate all required fields are present
      if (!name || !phone || !email || !role) {
        app.logger.warn({ name, phone, email, role }, 'Missing required fields in waitlist signup');
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      try {
        // Insert into support_tickets table
        await app.db.insert(schema.supportTickets).values({
          id: nanoid(),
          subject: `Waitlist Signup: ${name}`,
          body: JSON.stringify({ name, phone, email, role }),
          status: 'open' as const,
          priority: 'low' as const,
          category: 'general' as const,
        } as any);

        app.logger.info({ email, role }, 'Waitlist signup successful');
        return reply.status(201).send({
          success: true,
          message: "You're on the list!",
        });
      } catch (error) {
        app.logger.error({ err: error, email }, 'Failed to save waitlist signup');
        return reply.status(500).send({ error: 'Failed to save signup' });
      }
    }
  );
}
