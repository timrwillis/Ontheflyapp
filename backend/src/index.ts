import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { seedDatabase } from './db/seed.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerUserRoutes } from './routes/users.js';
import { registerBusinessRoutes } from './routes/businesses.js';
import { registerWorkerRoutes } from './routes/workers.js';
import { registerShiftRoutes } from './routes/shifts.js';
import { registerApplicationRoutes } from './routes/applications.js';
import { registerRatingRoutes } from './routes/ratings.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerMarketplaceRoutes } from './routes/marketplace.js';

// Merge schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Seed database if needed
await seedDatabase(app);

// Register routes
registerOnboardingRoutes(app, app.fastify);
registerUserRoutes(app, app.fastify);
registerBusinessRoutes(app, app.fastify);
registerWorkerRoutes(app, app.fastify);
registerShiftRoutes(app, app.fastify);
registerApplicationRoutes(app, app.fastify);
registerRatingRoutes(app, app.fastify);
registerNotificationRoutes(app, app.fastify);
registerAdminRoutes(app, app.fastify);
registerMarketplaceRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
