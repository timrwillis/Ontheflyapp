import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';
import { sendExpoPushNotification } from '../utils/pushNotification.js';

export { sendExpoPushNotification };

export function registerNotificationRoutes(app: App, fastify: FastifyInstance) {
  fastify.post(
    '/api/notifications/push-token',
    {
      schema: {
        description: 'Register an Expo push token for the authenticated user',
        tags: ['notifications'],
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
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

      const { token } = request.body as { token: string };
      app.logger.info({ userId: session.user.id }, 'Registering push token');

      const user = await app.db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id),
      });

      if (user) {
        const prefs = (user.notificationPreferences as Record<string, unknown>) ?? {};
        await app.db
          .update(schema.users)
          .set({ notificationPreferences: { ...prefs, push_token: token } })
          .where(eq(schema.users.id, session.user.id));
      }

      return { success: true };
    }
  );

  fastify.get(
    '/api/notifications',
    {
      schema: {
        description: 'Get all notifications for a user',
        tags: ['notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              notifications: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
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

      app.logger.info({ userId }, 'Getting notifications');

      const notifications = await app.db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId));

      notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      app.logger.info({ count: notifications.length }, 'Notifications retrieved');
      return { notifications };
    }
  );

  fastify.patch(
    '/api/notifications/:id/read',
    {
      schema: {
        description: 'Mark notification as read',
        tags: ['notifications'],
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

      app.logger.info({ id }, 'Marking notification as read');

      const notification = await app.db.query.notifications.findFirst({
        where: eq(schema.notifications.id, id),
      });

      if (!notification) {
        app.logger.warn({ id }, 'Notification not found');
        return reply.status(404).send({ error: 'Notification not found' });
      }

      const [updated] = await app.db
        .update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, id))
        .returning();

      app.logger.info({ id }, 'Notification marked as read');
      return updated;
    }
  );
}
