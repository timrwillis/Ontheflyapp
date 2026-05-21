import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function registerUserRoutes(app: App, fastify: FastifyInstance) {
  fastify.get(
    '/api/me',
    {
      schema: {
        description: 'Get current user profile with worker/manager profile and roles',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string', enum: ['worker', 'manager'] },
              onboarding_step: { type: 'integer' },
              profile_completed: { type: 'boolean' },
              worker_profile: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  photo_url: { type: ['string', 'null'] },
                  phone: { type: 'string' },
                  city: { type: 'string' },
                  bio: { type: ['string', 'null'] },
                  is_available: { type: 'boolean' },
                  reliability_score: { type: 'integer' },
                  onboarding_completed: { type: 'boolean' },
                  availability_days: { type: 'array', items: { type: 'string' } },
                  availability_start: { type: ['string', 'null'] },
                  availability_end: { type: ['string', 'null'] },
                  worker_roles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        role: { type: 'string' },
                        years_experience: { type: ['integer', 'null'] },
                        is_primary: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
              manager_profile: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'string' },
                  phone: { type: ['string', 'null'] },
                  is_verified: { type: 'boolean' },
                  onboarding_completed: { type: 'boolean' },
                },
              },
              subscription_status: { type: ['string', 'null'] },
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

      const authEmail = session.user.email;
      app.logger.info({ email: authEmail }, 'Getting user profile');

      // Look up user in app users table by email
      let user = await app.db.query.users.findFirst({
        where: eq(schema.users.email, authEmail),
      });

      if (!user) {
        app.logger.info({ email: authEmail, userId: session.user.id }, 'User not found, creating in users table');
        // Auto-create user in app's users table
        const newUser = {
          id: session.user.id,
          email: authEmail,
          name: session.user.name || 'User',
          role: 'worker' as const,
          onboardingStep: 0,
          profileCompleted: false,
          notificationPreferences: {
            shift_alerts: true,
            application_updates: true,
            reminders: true,
            marketing: false,
          },
        };
        await app.db.insert(schema.users).values(newUser);
        user = newUser as any;
      }

      // Fetch profile data based on role
      let workerProfile: any = null;
      let managerProfile: any = null;

      if (user.role === 'worker') {
        const profile = await app.db.query.workerProfiles.findFirst({
          where: eq(schema.workerProfiles.userId, user.id),
        });

        if (profile) {
          // Fetch worker roles for this worker profile
          const roles = await app.db.query.workerRoles.findMany({
            where: eq(schema.workerRoles.workerId, profile.id),
          });

          workerProfile = {
            id: profile.id,
            name: profile.name,
            photo_url: profile.photoUrl,
            phone: profile.phone,
            city: profile.city,
            bio: profile.bio,
            is_available: profile.isAvailable,
            reliability_score: profile.reliabilityScore,
            onboarding_completed: profile.onboardingCompleted,
            availability_days: profile.availabilityDays || [],
            availability_start: profile.availabilityStart,
            availability_end: profile.availabilityEnd,
            worker_roles: roles.map((r) => ({
              id: r.id,
              role: r.role,
              years_experience: r.yearsExperience,
              is_primary: r.isPrimary,
            })),
          };
        }
      } else if (user.role === 'manager') {
        const profile = await app.db.query.managerProfiles.findFirst({
          where: eq(schema.managerProfiles.userId, user.id),
        });

        if (profile) {
          managerProfile = {
            id: profile.id,
            phone: profile.phone,
            is_verified: profile.isVerified,
            onboarding_completed: profile.onboardingCompleted,
          };
        }
      }

      app.logger.info({ userId: user.id, role: user.role }, 'User profile retrieved');

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboarding_step: user.onboardingStep,
        profile_completed: user.profileCompleted,
        subscription_status: user.subscriptionStatus,
        worker_profile: workerProfile,
        manager_profile: managerProfile,
      };
    }
  );

  fastify.get(
    '/api/users/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
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
      app.logger.info({}, 'Getting user');

      // Get authenticated user from session
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });

      if (!session?.user) {
        app.logger.warn({}, 'Unauthorized: No session');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      app.logger.info({ userId: session.user.id }, 'Returning authenticated user');
      return session.user;
    }
  );

  fastify.post(
    '/api/users/switch-role',
    {
      schema: {
        description: 'Switch user role',
        tags: ['users'],
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['manager', 'worker', 'admin'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              onboarding_step: { type: 'integer' },
              profile_completed: { type: 'boolean' },
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
      const { role } = request.body as { role: string };

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
      app.logger.info({ userId, role }, 'Switching authenticated user role');

      // Get the user
      let user = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user && session?.user?.id) {
        // Auto-create user if authenticated but doesn't exist
        app.logger.info({ userId }, 'User not found, creating in users table');
        const newUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'User',
          role: role as any,
          onboardingStep: 0,
          profileCompleted: false,
          notificationPreferences: {
            shift_alerts: true,
            application_updates: true,
            reminders: true,
            marketing: false,
          },
        };
        await app.db.insert(schema.users).values(newUser);
        user = newUser as any;
      } else if (user) {
        // Update existing user's role
        await app.db.update(schema.users).set({ role: role as any }).where(eq(schema.users.id, userId));
        user = { ...user, role: role as any };
      } else {
        app.logger.warn({ userId }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      app.logger.info({ userId, role }, 'Role switched');
      return user;
    }
  );

  fastify.delete(
    '/api/users/me',
    {
      schema: {
        description: 'Delete a demo account (no auth required)',
        tags: ['users'],
        querystring: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['manager', 'worker', 'admin'] },
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
      const { role } = request.query as { role: string };

      app.logger.info({ role }, 'Deleting demo account');

      // Find the demo user by role
      const user = await app.db.query.users.findFirst({
        where: eq(schema.users.role, role as any),
      });

      if (!user) {
        app.logger.warn({ role }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      // Delete based on role
      if (role === 'worker') {
        app.logger.info({ userId: user.id }, 'Deleting worker profile and related data');

        // Get all worker profile IDs for this user
        const workerProfiles = await app.db
          .select()
          .from(schema.workerProfiles)
          .where(eq(schema.workerProfiles.userId, user.id));

        // Delete shift applications for all worker profiles
        for (const profile of workerProfiles) {
          await app.db
            .delete(schema.shiftApplications)
            .where(eq(schema.shiftApplications.workerId, profile.id));
        }

        // Delete worker profiles
        await app.db
          .delete(schema.workerProfiles)
          .where(eq(schema.workerProfiles.userId, user.id));

        // Delete notifications
        await app.db
          .delete(schema.notifications)
          .where(eq(schema.notifications.userId, user.id));
      } else if (role === 'manager') {
        app.logger.info({ userId: user.id }, 'Deleting manager business and related data');

        // Get all businesses for this user
        const businesses = await app.db
          .select()
          .from(schema.businesses)
          .where(eq(schema.businesses.userId, user.id));

        // For each business, delete shifts and cascade delete shift applications
        for (const business of businesses) {
          const shifts = await app.db
            .select()
            .from(schema.shifts)
            .where(eq(schema.shifts.businessId, business.id));

          for (const shift of shifts) {
            await app.db
              .delete(schema.shiftApplications)
              .where(eq(schema.shiftApplications.shiftId, shift.id));
          }

          await app.db
            .delete(schema.shifts)
            .where(eq(schema.shifts.businessId, business.id));
        }

        // Delete businesses
        await app.db
          .delete(schema.businesses)
          .where(eq(schema.businesses.userId, user.id));

        // Delete notifications
        await app.db
          .delete(schema.notifications)
          .where(eq(schema.notifications.userId, user.id));
      }
      // For admin, just delete the user (no cascading deletions needed)

      // Delete the user
      await app.db.delete(schema.users).where(eq(schema.users.id, user.id));

      app.logger.info({ userId: user.id, role }, 'Demo account deleted');
      return { success: true, message: 'Account deleted' };
    }
  );

  fastify.patch(
    '/api/me',
    {
      schema: {
        description: 'Update current user profile (terms agreement)',
        tags: ['users'],
        body: {
          type: 'object',
          properties: {
            agreed_to_terms: { type: 'boolean' },
            agreed_at: { type: 'string', format: 'date-time' },
            subscription_status: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              onboarding_step: { type: 'integer' },
              profile_completed: { type: 'boolean' },
              agreed_to_terms: { type: 'boolean' },
              agreed_at: { type: ['string', 'null'], format: 'date-time' },
              subscription_status: { type: ['string', 'null'] },
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
      const { agreed_to_terms, agreed_at, subscription_status } = request.body as {
        agreed_to_terms?: boolean;
        agreed_at?: string;
        subscription_status?: string;
      };

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
      app.logger.info({ userId, agreed_to_terms }, 'Updating user profile');

      // Look up user
      const user = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!user) {
        app.logger.warn({ userId }, 'User not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      // Build updates object with only provided fields
      const updates: any = {};
      if (agreed_to_terms !== undefined) {
        updates.agreedToTerms = agreed_to_terms;
      }
      if (agreed_at !== undefined) {
        updates.agreedAt = agreed_at ? new Date(agreed_at) : null;
      }
      if (subscription_status !== undefined) {
        updates.subscriptionStatus = subscription_status;
      }

      // Only update if there are fields to update
      if (Object.keys(updates).length > 0) {
        await app.db.update(schema.users).set(updates).where(eq(schema.users.id, userId));
        app.logger.info({ userId }, 'User profile updated');
      }

      // Return updated user
      const updated = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      return {
        id: updated?.id,
        email: updated?.email,
        name: updated?.name,
        role: updated?.role,
        onboarding_step: updated?.onboardingStep,
        profile_completed: updated?.profileCompleted,
        agreed_to_terms: updated?.agreedToTerms,
        agreed_at: updated?.agreedAt?.toISOString() || null,
        subscription_status: updated?.subscriptionStatus,
      };
    }
  );
}
