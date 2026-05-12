import { eq, isNull, or } from 'drizzle-orm';
import type { App } from '../index.js';
import * as schema from './schema/schema.js';

export async function seedDatabase(app: App) {
  app.logger.info('Seeding database with ON CONFLICT DO NOTHING...');

  // Insert users
  const users = [
    { id: 'u-mgr-1', email: 'manager@primesocial.com', name: 'Jake Morrison', role: 'manager' as const },
    { id: 'u-mgr-2', email: 'manager@midtowntavern.com', name: 'Sarah Chen', role: 'manager' as const },
    { id: 'u-mgr-3', email: 'manager@rawhide.com', name: 'Marcus Webb', role: 'manager' as const },
    { id: 'u-mgr-4', email: 'manager@lunabarrel.com', name: 'Priya Patel', role: 'manager' as const },
    { id: 'u-wrk-1', email: 'worker@barfly.com', name: 'Alex Rivera', role: 'worker' as const },
    { id: 'u-wrk-2', email: 'jordan@barfly.com', name: 'Jordan Blake', role: 'worker' as const },
    { id: 'u-wrk-3', email: 'casey@barfly.com', name: 'Casey Monroe', role: 'worker' as const },
    { id: 'u-wrk-4', email: 'taylor@barfly.com', name: 'Taylor Kim', role: 'worker' as const },
    { id: 'u-wrk-5', email: 'morgan@barfly.com', name: 'Morgan Davis', role: 'worker' as const },
    { id: 'u-wrk-6', email: 'riley@barfly.com', name: 'Riley Santos', role: 'worker' as const },
    { id: 'u-wrk-7', email: 'drew@barfly.com', name: 'Drew Nguyen', role: 'worker' as const },
    { id: 'u-wrk-8', email: 'sam@barfly.com', name: 'Sam Okafor', role: 'worker' as const },
    { id: 'u-wrk-9', email: 'jamie@barfly.com', name: 'Jamie Torres', role: 'worker' as const },
    { id: 'u-wrk-10', email: 'quinn@barfly.com', name: 'Quinn Park', role: 'worker' as const },
    { id: 'u-admin-1', email: 'admin@barfly.com', name: 'Admin User', role: 'admin' as const },
  ];

  await app.db.insert(schema.users).values(users).onConflictDoNothing();
  app.logger.info('Upserted 15 users');

  // Insert seed workers
  const seedWorkers = [
    { id: 'worker-seed-1', email: 'ashley.rivera@seed.com', name: 'Ashley Rivera', role: 'worker' as const },
    { id: 'worker-seed-2', email: 'marcus.johnson@seed.com', name: 'Marcus Johnson', role: 'worker' as const },
    { id: 'worker-seed-3', email: 'sofia.chen@seed.com', name: 'Sofia Chen', role: 'worker' as const },
    { id: 'worker-seed-4', email: 'jake.williams@seed.com', name: 'Jake Williams', role: 'worker' as const },
    { id: 'worker-seed-5', email: 'priya.patel@seed.com', name: 'Priya Patel', role: 'worker' as const },
    { id: 'worker-seed-6', email: 'devon.carter@seed.com', name: 'Devon Carter', role: 'worker' as const },
    { id: 'worker-seed-7', email: 'mia.thompson@seed.com', name: 'Mia Thompson', role: 'worker' as const },
    { id: 'worker-seed-8', email: 'carlos.mendez@seed.com', name: 'Carlos Mendez', role: 'worker' as const },
    { id: 'worker-seed-9', email: 'zoe.anderson@seed.com', name: 'Zoe Anderson', role: 'worker' as const },
    { id: 'worker-seed-10', email: 'tyler.brooks@seed.com', name: 'Tyler Brooks', role: 'worker' as const },
    { id: 'worker-seed-11', email: 'naomi.scott@seed.com', name: 'Naomi Scott', role: 'worker' as const },
    { id: 'worker-seed-12', email: 'eli.foster@seed.com', name: 'Eli Foster', role: 'worker' as const },
  ];

  await app.db.insert(schema.users).values(seedWorkers).onConflictDoNothing();
  app.logger.info('Upserted 12 seed workers');

  // Insert businesses
  const businesses = [
    {
      id: 'biz-1',
      userId: 'u-mgr-1',
      name: 'Prime Social KC',
      type: 'bar' as const,
      city: 'Kansas City',
      address: '4818 Main St, Kansas City, MO',
    },
    {
      id: 'biz-2',
      userId: 'u-mgr-1',
      name: 'Velvet Room',
      type: 'bar' as const,
      city: 'Kansas City',
      address: '1600 Genessee St, Kansas City, MO',
    },
    {
      id: 'biz-3',
      userId: 'u-mgr-2',
      name: 'Midtown Tavern',
      type: 'bar' as const,
      city: 'Kansas City',
      address: '3901 Main St, Kansas City, MO',
    },
    {
      id: 'biz-4',
      userId: 'u-mgr-2',
      name: 'Neon Alley',
      type: 'bar' as const,
      city: 'Kansas City',
      address: '501 Westport Rd, Kansas City, MO',
    },
    {
      id: 'biz-5',
      userId: 'u-mgr-3',
      name: 'Raw Hide Ranch',
      type: 'restaurant' as const,
      city: 'Kansas City',
      address: '6227 Brookside Blvd, Kansas City, MO',
    },
    {
      id: 'biz-6',
      userId: 'u-mgr-3',
      name: 'The Copper Mug',
      type: 'bar' as const,
      city: 'Kansas City',
      address: '4112 Pennsylvania Ave, Kansas City, MO',
    },
    {
      id: 'biz-7',
      userId: 'u-mgr-4',
      name: 'Luna Lounge',
      type: 'bar' as const,
      city: 'Kansas City',
      address: '1815 Wyandotte St, Kansas City, MO',
    },
    {
      id: 'biz-8',
      userId: 'u-mgr-4',
      name: 'Barrel House',
      type: 'restaurant' as const,
      city: 'Kansas City',
      address: '2101 Central St, Kansas City, MO',
    },
  ];

  await app.db.insert(schema.businesses).values(businesses).onConflictDoNothing();
  app.logger.info('Upserted 8 businesses');

  // Insert worker profiles
  const workerProfiles = [
    {
      id: 'wp-1',
      userId: 'u-wrk-1',
      name: 'Alex Rivera',
      photoUrl: 'https://i.pravatar.cc/150?img=11',
      phone: '816-555-0101',
      city: 'Kansas City',
      roles: ['Bartender', 'Barback'],
      yearsExperience: 6,
      certifications: ['TIPS Certified', 'ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 15,
      bio: 'High-volume bartender with 6 years at top KC venues. Fast, friendly, and reliable.',
      isAvailable: true,
      reliabilityScore: 97,
      isVerified: true,
      isSuspended: false,
    },
    {
      id: 'wp-2',
      userId: 'u-wrk-2',
      name: 'Jordan Blake',
      photoUrl: 'https://i.pravatar.cc/150?img=22',
      phone: '816-555-0102',
      city: 'Kansas City',
      roles: ['Server', 'Host'],
      yearsExperience: 4,
      certifications: ['ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Fine dining server with experience at upscale KC restaurants. Detail-oriented and professional.',
      isAvailable: true,
      reliabilityScore: 94,
      isVerified: true,
      isSuspended: false,
    },
    {
      id: 'wp-3',
      userId: 'u-wrk-3',
      name: 'Casey Monroe',
      photoUrl: 'https://i.pravatar.cc/150?img=33',
      phone: '816-555-0103',
      city: 'Kansas City',
      roles: ['Bartender', 'Event Staff'],
      yearsExperience: 8,
      certifications: ['TIPS Certified', 'Cicerone Beer Server'],
      hasTransportation: true,
      preferredRadiusMiles: 20,
      bio: 'Event specialist and craft cocktail bartender. 8 years experience including VIP events.',
      isAvailable: false,
      reliabilityScore: 99,
      isVerified: true,
      isSuspended: false,
    },
    {
      id: 'wp-4',
      userId: 'u-wrk-4',
      name: 'Taylor Kim',
      photoUrl: 'https://i.pravatar.cc/150?img=44',
      phone: '816-555-0104',
      city: 'Kansas City',
      roles: ['Line Cook', 'Prep Cook'],
      yearsExperience: 5,
      certifications: ['ServSafe Manager'],
      hasTransportation: false,
      preferredRadiusMiles: 8,
      bio: 'Line cook with 5 years in high-volume kitchens. Specializes in American and Asian fusion.',
      isAvailable: true,
      reliabilityScore: 91,
      isVerified: true,
      isSuspended: false,
    },
    {
      id: 'wp-5',
      userId: 'u-wrk-5',
      name: 'Morgan Davis',
      photoUrl: 'https://i.pravatar.cc/150?img=55',
      phone: '816-555-0105',
      city: 'Kansas City',
      roles: ['Server', 'Bartender'],
      yearsExperience: 3,
      certifications: ['TIPS Certified'],
      hasTransportation: true,
      preferredRadiusMiles: 12,
      bio: 'Versatile server and bartender. Quick learner, great with guests, always on time.',
      isAvailable: true,
      reliabilityScore: 88,
      isVerified: false,
      isSuspended: false,
    },
    {
      id: 'wp-6',
      userId: 'u-wrk-6',
      name: 'Riley Santos',
      photoUrl: 'https://i.pravatar.cc/150?img=66',
      phone: '816-555-0106',
      city: 'Kansas City',
      roles: ['Dishwasher', 'Busser'],
      yearsExperience: 2,
      certifications: [],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Reliable and hardworking. Available nights and weekends. Never missed a shift.',
      isAvailable: true,
      reliabilityScore: 95,
      isVerified: false,
      isSuspended: false,
    },
    {
      id: 'wp-7',
      userId: 'u-wrk-7',
      name: 'Drew Nguyen',
      photoUrl: 'https://i.pravatar.cc/150?img=77',
      phone: '816-555-0107',
      city: 'Kansas City',
      roles: ['Bartender', 'Barback', 'Event Staff'],
      yearsExperience: 7,
      certifications: ['TIPS Certified', 'ServSafe', 'Cicerone Beer Server'],
      hasTransportation: true,
      preferredRadiusMiles: 25,
      bio: 'Award-winning bartender and event specialist. Known for speed and craft cocktail expertise.',
      isAvailable: true,
      reliabilityScore: 98,
      isVerified: true,
      isSuspended: false,
    },
    {
      id: 'wp-8',
      userId: 'u-wrk-8',
      name: 'Sam Okafor',
      photoUrl: 'https://i.pravatar.cc/150?img=88',
      phone: '816-555-0108',
      city: 'Kansas City',
      roles: ['Host', 'Server'],
      yearsExperience: 2,
      certifications: ['ServSafe'],
      hasTransportation: false,
      preferredRadiusMiles: 5,
      bio: 'Friendly and professional host with a talent for making guests feel welcome.',
      isAvailable: false,
      reliabilityScore: 86,
      isVerified: false,
      isSuspended: false,
    },
    {
      id: 'wp-9',
      userId: 'u-wrk-9',
      name: 'Jamie Torres',
      photoUrl: 'https://i.pravatar.cc/150?img=99',
      phone: '816-555-0109',
      city: 'Kansas City',
      roles: ['Line Cook', 'Dishwasher'],
      yearsExperience: 4,
      certifications: ['ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 15,
      bio: 'Kitchen veteran comfortable in any station. Fast, clean, and team-oriented.',
      isAvailable: true,
      reliabilityScore: 92,
      isVerified: true,
      isSuspended: false,
    },
    {
      id: 'wp-10',
      userId: 'u-wrk-10',
      name: 'Quinn Park',
      photoUrl: 'https://i.pravatar.cc/150?img=12',
      phone: '816-555-0110',
      city: 'Kansas City',
      roles: ['Bartender', 'Server', 'Event Staff'],
      yearsExperience: 9,
      certifications: ['TIPS Certified', 'ServSafe Manager', 'Cicerone Certified Beer Server'],
      hasTransportation: true,
      preferredRadiusMiles: 30,
      bio: 'Senior bartender and event lead. 9 years experience, 200+ shifts completed. Top-rated on Bar-Fly.',
      isAvailable: true,
      reliabilityScore: 100,
      isVerified: true,
      isSuspended: false,
    },
  ];

  await app.db.insert(schema.workerProfiles).values(workerProfiles).onConflictDoNothing();
  app.logger.info('Upserted 10 worker profiles');

  // Insert seed worker profiles
  const seedWorkerProfiles = [
    {
      id: 'worker-profile-1',
      userId: 'worker-seed-1',
      name: 'Ashley Rivera',
      photoUrl: 'https://picsum.photos/seed/worker-seed-1/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Bartender'],
      yearsExperience: 6,
      certifications: ['TIPS', 'ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Expert bartender with 6 years of craft cocktail experience.',
      isAvailable: true,
      reliabilityScore: 98,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 3,
      distanceMiles: '0.8',
      avgRating: '4.90',
    },
    {
      id: 'worker-profile-2',
      userId: 'worker-seed-2',
      name: 'Marcus Johnson',
      photoUrl: 'https://picsum.photos/seed/worker-seed-2/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Bartender'],
      yearsExperience: 4,
      certifications: ['TIPS'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Friendly bartender with strong customer service skills.',
      isAvailable: true,
      reliabilityScore: 95,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 5,
      distanceMiles: '1.2',
      avgRating: '4.80',
    },
    {
      id: 'worker-profile-3',
      userId: 'worker-seed-3',
      name: 'Sofia Chen',
      photoUrl: 'https://picsum.photos/seed/worker-seed-3/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Server'],
      yearsExperience: 5,
      certifications: ['ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Attentive server with fine dining experience.',
      isAvailable: true,
      reliabilityScore: 97,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 4,
      distanceMiles: '2.1',
      avgRating: '4.90',
    },
    {
      id: 'worker-profile-4',
      userId: 'worker-seed-4',
      name: 'Jake Williams',
      photoUrl: 'https://picsum.photos/seed/worker-seed-4/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Line Cook'],
      yearsExperience: 7,
      certifications: ['ServSafe', 'Food Handler'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Skilled line cook proficient in all stations.',
      isAvailable: true,
      reliabilityScore: 92,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 8,
      distanceMiles: '1.5',
      avgRating: '4.70',
    },
    {
      id: 'worker-profile-5',
      userId: 'worker-seed-5',
      name: 'Priya Patel',
      photoUrl: 'https://picsum.photos/seed/worker-seed-5/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Event Staff'],
      yearsExperience: 3,
      certifications: ['TIPS', 'ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Event professional with excellent organizational skills.',
      isAvailable: true,
      reliabilityScore: 96,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 6,
      distanceMiles: '3.2',
      avgRating: '4.80',
    },
    {
      id: 'worker-profile-6',
      userId: 'worker-seed-6',
      name: 'Devon Carter',
      photoUrl: 'https://picsum.photos/seed/worker-seed-6/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Bartender'],
      yearsExperience: 2,
      certifications: ['TIPS'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Enthusiastic bartender eager to grow in the industry.',
      isAvailable: true,
      reliabilityScore: 89,
      isVerified: false,
      isSuspended: false,
      responseTimeMinutes: 12,
      distanceMiles: '4.1',
      avgRating: '4.60',
    },
    {
      id: 'worker-profile-7',
      userId: 'worker-seed-7',
      name: 'Mia Thompson',
      photoUrl: 'https://picsum.photos/seed/worker-seed-7/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Server'],
      yearsExperience: 8,
      certifications: ['ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Experienced server with exceptional reliability record.',
      isAvailable: true,
      reliabilityScore: 99,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 2,
      distanceMiles: '0.5',
      avgRating: '4.90',
    },
    {
      id: 'worker-profile-8',
      userId: 'worker-seed-8',
      name: 'Carlos Mendez',
      photoUrl: 'https://picsum.photos/seed/worker-seed-8/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Line Cook'],
      yearsExperience: 5,
      certifications: ['ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Dedicated line cook with passion for quality food.',
      isAvailable: false,
      reliabilityScore: 91,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 9,
      distanceMiles: '2.8',
      avgRating: '4.70',
    },
    {
      id: 'worker-profile-9',
      userId: 'worker-seed-9',
      name: 'Zoe Anderson',
      photoUrl: 'https://picsum.photos/seed/worker-seed-9/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Host'],
      yearsExperience: 3,
      certifications: ['ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Welcoming host with strong people skills.',
      isAvailable: true,
      reliabilityScore: 94,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 7,
      distanceMiles: '1.9',
      avgRating: '4.80',
    },
    {
      id: 'worker-profile-10',
      userId: 'worker-seed-10',
      name: 'Tyler Brooks',
      photoUrl: 'https://picsum.photos/seed/worker-seed-10/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Dishwasher'],
      yearsExperience: 1,
      certifications: ['Food Handler'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Hardworking dishwasher with positive attitude.',
      isAvailable: true,
      reliabilityScore: 88,
      isVerified: false,
      isSuspended: false,
      responseTimeMinutes: 15,
      distanceMiles: '3.5',
      avgRating: '4.50',
    },
    {
      id: 'worker-profile-11',
      userId: 'worker-seed-11',
      name: 'Naomi Scott',
      photoUrl: 'https://picsum.photos/seed/worker-seed-11/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Bartender'],
      yearsExperience: 9,
      certifications: ['TIPS', 'ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Senior bartender with extensive mixology knowledge.',
      isAvailable: true,
      reliabilityScore: 97,
      isVerified: true,
      isSuspended: false,
      responseTimeMinutes: 4,
      distanceMiles: '1.1',
      avgRating: '4.90',
    },
    {
      id: 'worker-profile-12',
      userId: 'worker-seed-12',
      name: 'Eli Foster',
      photoUrl: 'https://picsum.photos/seed/worker-seed-12/200/200',
      phone: '555-000-0000',
      city: 'San Francisco',
      roles: ['Event Staff'],
      yearsExperience: 4,
      certifications: ['TIPS'],
      hasTransportation: true,
      preferredRadiusMiles: 10,
      bio: 'Capable event staff with leadership potential.',
      isAvailable: false,
      reliabilityScore: 90,
      isVerified: false,
      isSuspended: false,
      responseTimeMinutes: 11,
      distanceMiles: '5.0',
      avgRating: '4.60',
    },
  ];

  await app.db.insert(schema.workerProfiles).values(seedWorkerProfiles).onConflictDoNothing();
  app.logger.info('Upserted 12 seed worker profiles');

  // Backfill existing worker profiles with defaults for new columns
  await app.db
    .update(schema.workerProfiles)
    .set({
      responseTimeMinutes: 10,
      distanceMiles: '3.0',
      avgRating: '4.5',
    })
    .where(
      or(
        isNull(schema.workerProfiles.responseTimeMinutes),
        isNull(schema.workerProfiles.distanceMiles),
        isNull(schema.workerProfiles.avgRating)
      )
    );
  app.logger.info('Backfilled worker profiles with default values');

  // Calculate dates
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Calculate weekend dates
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;

  const thisFriday = new Date(today);
  thisFriday.setDate(thisFriday.getDate() + daysUntilFriday);
  const thisSaturday = new Date(today);
  thisSaturday.setDate(thisSaturday.getDate() + daysUntilSaturday);
  const nextMonday = new Date(today);
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  const nextTuesday = new Date(today);
  nextTuesday.setDate(nextTuesday.getDate() + daysUntilTuesday);
  const nextWednesday = new Date(today);
  nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);

  const thisFridayStr = thisFriday.toISOString().split('T')[0];
  const thisSaturdayStr = thisSaturday.toISOString().split('T')[0];
  const nextMondayStr = nextMonday.toISOString().split('T')[0];
  const nextTuesdayStr = nextTuesday.toISOString().split('T')[0];
  const nextWednesdayStr = nextWednesday.toISOString().split('T')[0];

  // First, delete existing shift_applications and shifts
  await app.db.delete(schema.shiftApplications);
  await app.db.delete(schema.shifts);

  // Insert shifts
  const shifts = [
    { id: 'shift-1', businessId: 'biz-1', roleNeeded: 'Bartender', workersNeeded: 2, workersConfirmed: 0, date: todayStr, startTime: '19:00', endTime: '02:00', hourlyPay: '38', location: '4818 Main St, Kansas City, MO', dressCode: 'All Black', experienceRequired: '2+ years bar experience', certificationsRequired: [], notes: 'VIP event tonight, high volume', urgency: 'emergency' as const, status: 'open' as const },
    { id: 'shift-2', businessId: 'biz-3', roleNeeded: 'Server', workersNeeded: 3, workersConfirmed: 1, date: todayStr, startTime: '18:00', endTime: '23:00', hourlyPay: '24', location: '3901 Main St, Kansas City, MO', dressCode: 'Black shirt, dark jeans', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'tonight' as const, status: 'open' as const },
    { id: 'shift-3', businessId: 'biz-2', roleNeeded: 'Event Bartender', workersNeeded: 2, workersConfirmed: 0, date: todayStr, startTime: '21:00', endTime: '03:00', hourlyPay: '45', location: '1600 Genessee St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: ['TIPS Certified'], notes: 'VIP private event, upscale venue', urgency: 'emergency' as const, status: 'open' as const },
    { id: 'shift-4', businessId: 'biz-4', roleNeeded: 'Line Cook', workersNeeded: 1, workersConfirmed: 0, date: tomorrowStr, startTime: '16:00', endTime: '23:00', hourlyPay: '30', location: '501 Westport Rd, Kansas City, MO', dressCode: '', experienceRequired: '1+ year line cook', certificationsRequired: [], notes: '', urgency: 'high' as const, status: 'open' as const },
    { id: 'shift-5', businessId: 'biz-5', roleNeeded: 'Dishwasher', workersNeeded: 1, workersConfirmed: 0, date: todayStr, startTime: '17:00', endTime: '22:00', hourlyPay: '22', location: '6227 Brookside Blvd, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'tonight' as const, status: 'open' as const },
    { id: 'shift-6', businessId: 'biz-6', roleNeeded: 'Host/Hostess', workersNeeded: 2, workersConfirmed: 1, date: tomorrowStr, startTime: '17:00', endTime: '22:00', hourlyPay: '20', location: '4112 Pennsylvania Ave, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'tomorrow' as const, status: 'open' as const },
    { id: 'shift-7', businessId: 'biz-7', roleNeeded: 'Barback', workersNeeded: 1, workersConfirmed: 0, date: todayStr, startTime: '20:00', endTime: '02:00', hourlyPay: '18', location: '1815 Wyandotte St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: 'Fast-paced lounge, VIP section', urgency: 'tonight' as const, status: 'open' as const },
    { id: 'shift-8', businessId: 'biz-8', roleNeeded: 'Server', workersNeeded: 4, workersConfirmed: 2, date: thisSaturdayStr, startTime: '11:00', endTime: '17:00', hourlyPay: '26', location: '2101 Central St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'this_week' as const, status: 'open' as const },
    { id: 'shift-9', businessId: 'biz-1', roleNeeded: 'Bartender', workersNeeded: 3, workersConfirmed: 1, date: thisSaturdayStr, startTime: '20:00', endTime: '02:00', hourlyPay: '40', location: '4818 Main St, Kansas City, MO', dressCode: 'All Black', experienceRequired: '', certificationsRequired: ['TIPS Certified'], notes: '', urgency: 'high' as const, status: 'open' as const },
    { id: 'shift-10', businessId: 'biz-2', roleNeeded: 'Event Staff', workersNeeded: 5, workersConfirmed: 3, date: thisFridayStr, startTime: '19:00', endTime: '01:00', hourlyPay: '28', location: '1600 Genessee St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: 'Large private event, multiple roles', urgency: 'this_week' as const, status: 'open' as const },
    { id: 'shift-11', businessId: 'biz-3', roleNeeded: 'Line Cook', workersNeeded: 1, workersConfirmed: 0, date: nextMondayStr, startTime: '15:00', endTime: '22:00', hourlyPay: '32', location: '3901 Main St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'medium' as const, status: 'open' as const },
    { id: 'shift-12', businessId: 'biz-4', roleNeeded: 'Bartender', workersNeeded: 2, workersConfirmed: 0, date: nextTuesdayStr, startTime: '19:00', endTime: '01:00', hourlyPay: '35', location: '501 Westport Rd, Kansas City, MO', dressCode: 'Smart casual', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'medium' as const, status: 'open' as const },
    { id: 'shift-13', businessId: 'biz-7', roleNeeded: 'Server', workersNeeded: 2, workersConfirmed: 1, date: todayStr, startTime: '18:00', endTime: '23:00', hourlyPay: '22', location: '1815 Wyandotte St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'tonight' as const, status: 'open' as const },
    { id: 'shift-14', businessId: 'biz-8', roleNeeded: 'Barback', workersNeeded: 1, workersConfirmed: 0, date: tomorrowStr, startTime: '17:00', endTime: '23:00', hourlyPay: '16', location: '2101 Central St, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'tomorrow' as const, status: 'open' as const },
    { id: 'shift-15', businessId: 'biz-6', roleNeeded: 'Event Bartender', workersNeeded: 2, workersConfirmed: 0, date: thisSaturdayStr, startTime: '18:00', endTime: '00:00', hourlyPay: '42', location: '4112 Pennsylvania Ave, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: ['TIPS Certified', 'Food Handler'], notes: 'Wedding reception, premium event', urgency: 'high' as const, status: 'open' as const },
    { id: 'shift-16', businessId: 'biz-5', roleNeeded: 'Host/Hostess', workersNeeded: 1, workersConfirmed: 0, date: nextWednesdayStr, startTime: '17:00', endTime: '22:00', hourlyPay: '19', location: '6227 Brookside Blvd, Kansas City, MO', dressCode: '', experienceRequired: '', certificationsRequired: [], notes: '', urgency: 'medium' as const, status: 'open' as const },
  ];

  await app.db.insert(schema.shifts).values(shifts).onConflictDoNothing();
  app.logger.info('Upserted 12 shifts');

  // Insert shift applications
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  const shiftApplications = [
    {
      id: 'app-1',
      shiftId: 'shift-9',
      workerId: 'wp-1',
      status: 'confirmed' as const,
      appliedAt: oneDayAgo,
      confirmedAt: oneDayAgo,
    },
    {
      id: 'app-2',
      shiftId: 'shift-10',
      workerId: 'wp-2',
      status: 'confirmed' as const,
      appliedAt: oneDayAgo,
      confirmedAt: oneDayAgo,
    },
    {
      id: 'app-3',
      shiftId: 'shift-10',
      workerId: 'wp-5',
      status: 'confirmed' as const,
      appliedAt: oneDayAgo,
      confirmedAt: oneDayAgo,
    },
    {
      id: 'app-4',
      shiftId: 'shift-11',
      workerId: 'wp-3',
      status: 'confirmed' as const,
      appliedAt: threeDaysAgo,
      confirmedAt: threeDaysAgo,
    },
    {
      id: 'app-5',
      shiftId: 'shift-1',
      workerId: 'wp-7',
      status: 'pending' as const,
      appliedAt: now,
      confirmedAt: null,
    },
    {
      id: 'app-6',
      shiftId: 'shift-3',
      workerId: 'wp-10',
      status: 'pending' as const,
      appliedAt: now,
      confirmedAt: null,
    },
  ];

  await app.db.insert(schema.shiftApplications).values(shiftApplications).onConflictDoNothing();
  app.logger.info('Upserted 6 shift applications');

  // Calculate timestamps for ratings (using different names to avoid conflicts)
  const ratingTs2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const ratingTs3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const ratingTs5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const ratingTs7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ratingTs10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const ratingTs12 = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
  const ratingTs14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const ratingTs16 = new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000);

  // Insert ratings
  const ratings = [
    { id: 'r-1', shiftId: 'shift-1', workerId: 'wp-1', managerId: 'u-mgr-1', score: 5, comment: 'Exceptional bartender — fast, friendly, and handled the VIP crowd perfectly. Will definitely book again.', createdAt: ratingTs2 },
    { id: 'r-2', shiftId: 'shift-2', workerId: 'wp-2', managerId: 'u-mgr-3', score: 5, comment: 'Showed up early, knew the menu cold, and guests loved her. One of the best servers we\'ve had.', createdAt: ratingTs3 },
    { id: 'r-3', shiftId: 'shift-3', workerId: 'wp-3', managerId: 'u-mgr-2', score: 4, comment: 'Solid work behind the bar. Kept up with the rush and maintained quality throughout the night.', createdAt: ratingTs5 },
    { id: 'r-4', shiftId: 'shift-4', workerId: 'wp-4', managerId: 'u-mgr-4', score: 5, comment: 'Incredible line cook — clean station, fast tickets, zero complaints from the floor. Highly recommend.', createdAt: ratingTs7 },
    { id: 'r-5', shiftId: 'shift-5', workerId: 'wp-5', managerId: 'u-mgr-1', score: 4, comment: 'Reliable and hardworking. Kept the kitchen running smoothly during a busy Friday night.', createdAt: ratingTs10 },
    { id: 'r-6', shiftId: 'shift-6', workerId: 'wp-1', managerId: 'u-mgr-3', score: 5, comment: 'Guests were impressed with the service. Professional attitude and great energy all night.', createdAt: ratingTs12 },
    { id: 'r-7', shiftId: 'shift-7', workerId: 'wp-2', managerId: 'u-mgr-2', score: 4, comment: 'Good barback — kept bottles stocked and ice full without being asked. Solid team player.', createdAt: ratingTs14 },
    { id: 'r-8', shiftId: 'shift-8', workerId: 'wp-3', managerId: 'u-mgr-4', score: 5, comment: 'Outstanding performance during a packed Saturday brunch. Handled a 6-table section without missing a beat.', createdAt: ratingTs16 },
  ];

  await app.db.insert(schema.ratings).values(ratings).onConflictDoNothing();
  app.logger.info('Upserted 8 ratings');

  // Insert certifications
  const certifications = [
    {
      id: 'c-1',
      name: 'TIPS Certified',
      description: 'Training for Intervention ProcedureS - responsible alcohol service certification',
    },
    {
      id: 'c-2',
      name: 'ServSafe',
      description: 'Food safety certification from the National Restaurant Association',
    },
    {
      id: 'c-3',
      name: 'Cicerone Beer Server',
      description: 'Certified beer server specializing in craft beer knowledge',
    },
  ];

  await app.db.insert(schema.certifications).values(certifications).onConflictDoNothing();
  app.logger.info('Upserted 3 certifications');

  // Insert notifications
  const notifications = [
    {
      id: 'n-1',
      userId: 'u-wrk-1',
      title: 'New shift near you!',
      body: 'A Bartender shift at Prime Social KC is available tonight for $38/hr.',
      type: 'shift_posted' as const,
      read: false,
      shiftId: 'shift-1',
      createdAt: now,
    },
    {
      id: 'n-2',
      userId: 'u-wrk-7',
      title: 'Your application was received',
      body: 'Your application for the Bartender shift at Prime Social KC has been received.',
      type: 'shift_accepted' as const,
      read: false,
      shiftId: 'shift-1',
      createdAt: now,
    },
  ];

  await app.db.insert(schema.notifications).values(notifications).onConflictDoNothing();
  app.logger.info('Upserted 2 notifications');

  app.logger.info('Database seeding completed successfully');
}
