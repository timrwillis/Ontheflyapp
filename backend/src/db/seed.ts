import { eq } from 'drizzle-orm';
import type { App } from '../index.js';
import * as schema from './schema/schema.js';

export async function seedDatabase(app: App) {
  app.logger.info('Seeding database...');

  try {
    // Insert seed user
    const seedUser = {
      id: 'seed_user_001',
      email: 'seed@onthefly.com',
      name: 'Seed User',
      role: 'manager' as const,
    };

    const existingSeedUser = await app.db.query.users.findFirst({
      where: eq(schema.users.id, seedUser.id),
    });
    if (!existingSeedUser) {
      await app.db.insert(schema.users).values(seedUser);
    }
    app.logger.info('Verified seed user');

    // Insert sample businesses
    const businesses = [
      {
        id: 'biz_001',
        userId: 'seed_user_001',
        name: 'The Grand Hotel',
        type: 'hotel' as const,
        city: 'Miami',
        address: '100 Ocean Drive, Miami FL',
        phone: '305-555-0101',
        description: 'Luxury beachfront hotel with multiple dining venues',
        website: 'https://thegrandhotel.com',
        logoUrl: 'https://picsum.photos/seed/grand/200/200',
        isVerified: true,
        isSuspended: false,
      },
      {
        id: 'biz_002',
        userId: 'seed_user_001',
        name: 'Skyline Rooftop Bar',
        type: 'bar' as const,
        city: 'Miami',
        address: '500 Brickell Ave, Miami FL',
        phone: '305-555-0202',
        description: 'Upscale rooftop bar with panoramic city views',
        website: 'https://skylinerooftop.com',
        logoUrl: 'https://picsum.photos/seed/skyline/200/200',
        isVerified: true,
        isSuspended: false,
      },
      {
        id: 'biz_003',
        userId: 'seed_user_001',
        name: 'Coastal Kitchen',
        type: 'restaurant' as const,
        city: 'Miami',
        address: '200 Collins Ave, Miami FL',
        phone: '305-555-0303',
        description: 'Farm-to-table coastal cuisine restaurant',
        website: '',
        logoUrl: 'https://picsum.photos/seed/coastal/200/200',
        isVerified: true,
        isSuspended: false,
      },
    ];

    for (const business of businesses) {
      const existing = await app.db.query.businesses.findFirst({
        where: eq(schema.businesses.id, business.id),
      });
      if (!existing) {
        await app.db.insert(schema.businesses).values(business);
      }
    }
    app.logger.info('Verified 3 sample businesses');

    // Insert sample shifts
    const shifts = [
      {
        id: 'shift_001',
        businessId: 'biz_001',
        roleNeeded: 'bartender',
        workersNeeded: 2,
        workersConfirmed: 0,
        date: '2025-08-15',
        startTime: '18:00',
        endTime: '02:00',
        hourlyPay: '25',
        location: 'The Grand Hotel - Main Bar',
        dressCode: 'Black formal',
        experienceRequired: '2+ years',
        certificationsRequired: [],
        notes: 'High-volume weekend event',
        urgency: 'high' as const,
        status: 'open' as const,
      },
      {
        id: 'shift_002',
        businessId: 'biz_002',
        roleNeeded: 'server',
        workersNeeded: 4,
        workersConfirmed: 1,
        date: '2025-08-16',
        startTime: '17:00',
        endTime: '23:00',
        hourlyPay: '20',
        location: 'Skyline Rooftop Bar',
        dressCode: 'All black',
        experienceRequired: '1+ year',
        certificationsRequired: [],
        notes: 'Private corporate event',
        urgency: 'high' as const,
        status: 'open' as const,
      },
      {
        id: 'shift_003',
        businessId: 'biz_003',
        roleNeeded: 'cook',
        workersNeeded: 1,
        workersConfirmed: 0,
        date: '2025-08-17',
        startTime: '10:00',
        endTime: '16:00',
        hourlyPay: '22',
        location: 'Coastal Kitchen',
        dressCode: 'Chef whites provided',
        experienceRequired: '3+ years',
        certificationsRequired: [],
        notes: 'Brunch service',
        urgency: 'medium' as const,
        status: 'open' as const,
      },
      {
        id: 'shift_004',
        businessId: 'biz_001',
        roleNeeded: 'event_staff',
        workersNeeded: 6,
        workersConfirmed: 2,
        date: '2025-08-18',
        startTime: '14:00',
        endTime: '22:00',
        hourlyPay: '18',
        location: 'The Grand Hotel - Ballroom',
        dressCode: 'Business casual',
        experienceRequired: '',
        certificationsRequired: [],
        notes: 'Wedding reception setup and service',
        urgency: 'medium' as const,
        status: 'open' as const,
      },
      {
        id: 'shift_005',
        businessId: 'biz_002',
        roleNeeded: 'barback',
        workersNeeded: 2,
        workersConfirmed: 0,
        date: '2025-08-19',
        startTime: '20:00',
        endTime: '04:00',
        hourlyPay: '17',
        location: 'Skyline Rooftop Bar',
        dressCode: 'All black',
        experienceRequired: '',
        certificationsRequired: [],
        notes: 'Weekend night shift',
        urgency: 'low' as const,
        status: 'open' as const,
      },
      {
        id: 'shift_006',
        businessId: 'biz_003',
        roleNeeded: 'host',
        workersNeeded: 1,
        workersConfirmed: 0,
        date: '2025-08-20',
        startTime: '11:00',
        endTime: '15:00',
        hourlyPay: '16',
        location: 'Coastal Kitchen',
        dressCode: 'Smart casual',
        experienceRequired: '',
        certificationsRequired: [],
        notes: 'Lunch service host',
        urgency: 'medium' as const,
        status: 'open' as const,
      },
    ];

    for (const shift of shifts) {
      const existing = await app.db.query.shifts.findFirst({
        where: eq(schema.shifts.id, shift.id),
      });
      if (!existing) {
        await app.db.insert(schema.shifts).values(shift);
      }
    }
    app.logger.info('Verified 6 sample shifts');

    // Insert sample worker users - check by ID first
    const workerUsers = [
      { id: 'seed_worker_001', email: 'marcus.rivera@seed.com', name: 'Marcus Rivera', role: 'worker' as const },
      { id: 'seed_worker_002', email: 'sofia.chen@seed.com', name: 'Sofia Chen', role: 'worker' as const },
      { id: 'seed_worker_003', email: 'james.thompson@seed.com', name: 'James Thompson', role: 'worker' as const },
      { id: 'seed_worker_004', email: 'aaliyah.johnson@seed.com', name: 'Aaliyah Johnson', role: 'worker' as const },
    ];

    // Insert each user by checking if ID exists
    for (const user of workerUsers) {
      const existing = await app.db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });
      if (!existing) {
        await app.db.insert(schema.users).values(user);
        app.logger.info({ userId: user.id }, 'Inserted worker user');
      }
    }
    app.logger.info('Verified 4 worker users');

    // Verify all worker users exist before inserting profiles
    const workerUserIds = ['seed_worker_001', 'seed_worker_002', 'seed_worker_003', 'seed_worker_004'];
    for (const userId of workerUserIds) {
      const exists = await app.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      if (!exists) {
        throw new Error(`Worker user ${userId} does not exist in database!`);
      }
    }
    app.logger.info('All worker users verified to exist');

    // Insert sample worker profiles
    const workerProfiles = [
      {
        id: 'wp_001',
        userId: 'seed_worker_001',
        name: 'Marcus Rivera',
        photoUrl: 'https://picsum.photos/seed/marcus/200/200',
        phone: '305-555-1001',
        city: 'Miami',
        bio: 'Experienced craft cocktail bartender with 5 years in Miami nightlife',
        hasTransportation: true,
        preferredRadiusMiles: 15,
        isAvailable: true,
        reliabilityScore: 95,
        isVerified: true,
        isSuspended: false,
        onboardingCompleted: true,
      },
      {
        id: 'wp_002',
        userId: 'seed_worker_002',
        name: 'Sofia Chen',
        photoUrl: 'https://picsum.photos/seed/sofia/200/200',
        phone: '305-555-1002',
        city: 'Miami',
        bio: 'Professional server with fine dining and event experience',
        hasTransportation: true,
        preferredRadiusMiles: 10,
        isAvailable: true,
        reliabilityScore: 88,
        isVerified: true,
        isSuspended: false,
        onboardingCompleted: true,
      },
      {
        id: 'wp_003',
        userId: 'seed_worker_003',
        name: 'James Thompson',
        photoUrl: 'https://picsum.photos/seed/james/200/200',
        phone: '305-555-1003',
        city: 'Miami',
        bio: 'Line cook specializing in seafood and Latin cuisine',
        hasTransportation: false,
        preferredRadiusMiles: 5,
        isAvailable: false,
        reliabilityScore: 92,
        isVerified: true,
        isSuspended: false,
        onboardingCompleted: true,
      },
      {
        id: 'wp_004',
        userId: 'seed_worker_004',
        name: 'Aaliyah Johnson',
        photoUrl: 'https://picsum.photos/seed/aaliyah/200/200',
        phone: '305-555-1004',
        city: 'Miami',
        bio: 'Energetic event staff with catering and banquet experience',
        hasTransportation: true,
        preferredRadiusMiles: 20,
        isAvailable: true,
        reliabilityScore: 80,
        isVerified: false,
        isSuspended: false,
        onboardingCompleted: true,
      },
    ];

    // Insert each profile - check by ID first
    for (const profile of workerProfiles) {
      const existing = await app.db.query.workerProfiles.findFirst({
        where: eq(schema.workerProfiles.id, profile.id),
      });
      if (!existing) {
        await app.db.insert(schema.workerProfiles).values(profile);
        app.logger.info({ profileId: profile.id }, 'Inserted worker profile');
      }
    }
    app.logger.info('Verified 4 sample worker profiles');

    // Insert worker roles
    const workerRoles = [
      { id: 'wr_001', workerId: 'wp_001', role: 'bartender' as const, yearsExperience: 5, isPrimary: true },
      { id: 'wr_002', workerId: 'wp_001', role: 'barback' as const, yearsExperience: 5, isPrimary: false },
      { id: 'wr_003', workerId: 'wp_002', role: 'server' as const, yearsExperience: 3, isPrimary: true },
      { id: 'wr_004', workerId: 'wp_002', role: 'host' as const, yearsExperience: 2, isPrimary: false },
      { id: 'wr_005', workerId: 'wp_003', role: 'cook' as const, yearsExperience: 7, isPrimary: true },
      { id: 'wr_006', workerId: 'wp_003', role: 'dishwasher' as const, yearsExperience: 7, isPrimary: false },
      { id: 'wr_007', workerId: 'wp_004', role: 'event_staff' as const, yearsExperience: 2, isPrimary: true },
      { id: 'wr_008', workerId: 'wp_004', role: 'server' as const, yearsExperience: 1, isPrimary: false },
    ];

    for (const role of workerRoles) {
      const existing = await app.db.query.workerRoles.findFirst({
        where: eq(schema.workerRoles.id, role.id),
      });
      if (!existing) {
        await app.db.insert(schema.workerRoles).values(role);
      }
    }
    app.logger.info('Verified worker roles');

    app.logger.info('Database seeding complete!');
  } catch (err) {
    app.logger.error({ err }, 'Critical error during database seeding');
    throw err;
  }
}
