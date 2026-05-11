import { eq } from 'drizzle-orm';
import type { App } from '../index.js';
import * as schema from './schema/schema.js';

export async function seedDatabase(app: App) {
  app.logger.info('Checking if database needs seeding...');

  const existingUsers = await app.db.select().from(schema.users);

  if (existingUsers.length > 0) {
    app.logger.info('Database already seeded, skipping');
    return;
  }

  app.logger.info('Seeding database...');

  // Insert users
  const users = [
    { id: 'u-admin-1', email: 'admin@shiftslinger.com', name: 'Alex Admin', role: 'admin' as const },
    { id: 'u-mgr-1', email: 'manager1@shiftslinger.com', name: 'Maria Santos', role: 'manager' as const },
    { id: 'u-mgr-2', email: 'manager2@shiftslinger.com', name: 'Jake Brennan', role: 'manager' as const },
    { id: 'u-mgr-3', email: 'manager3@shiftslinger.com', name: 'Priya Patel', role: 'manager' as const },
    { id: 'u-wrk-1', email: 'worker1@shiftslinger.com', name: 'Carlos Rivera', role: 'worker' as const },
    { id: 'u-wrk-2', email: 'worker2@shiftslinger.com', name: 'Tasha Williams', role: 'worker' as const },
    { id: 'u-wrk-3', email: 'worker3@shiftslinger.com', name: 'Devon Park', role: 'worker' as const },
    { id: 'u-wrk-4', email: 'worker4@shiftslinger.com', name: 'Mia Chen', role: 'worker' as const },
    { id: 'u-wrk-5', email: 'worker5@shiftslinger.com', name: 'Ricky Torres', role: 'worker' as const },
    { id: 'u-wrk-6', email: 'worker6@shiftslinger.com', name: 'Jade Murphy', role: 'worker' as const },
    { id: 'u-wrk-7', email: 'worker7@shiftslinger.com', name: 'Sam Okafor', role: 'worker' as const },
    { id: 'u-wrk-8', email: 'worker8@shiftslinger.com', name: 'Lily Nguyen', role: 'worker' as const },
  ];

  await app.db.insert(schema.users).values(users);
  app.logger.info('Inserted 12 users');

  // Insert businesses
  const businesses = [
    {
      id: 'b-1',
      userId: 'u-mgr-1',
      name: 'The Rusty Anchor',
      type: 'bar' as const,
      city: 'Chicago, IL',
      address: '1420 N Milwaukee Ave, Chicago, IL 60622',
    },
    {
      id: 'b-2',
      userId: 'u-mgr-2',
      name: 'Harvest Table',
      type: 'restaurant' as const,
      city: 'Chicago, IL',
      address: '845 W Randolph St, Chicago, IL 60607',
    },
    {
      id: 'b-3',
      userId: 'u-mgr-3',
      name: 'Metro Events Co.',
      type: 'venue' as const,
      city: 'Chicago, IL',
      address: '301 E Cermak Rd, Chicago, IL 60616',
    },
    {
      id: 'b-4',
      userId: 'u-mgr-1',
      name: 'Gilt Bar',
      type: 'bar' as const,
      city: 'Chicago, IL',
      address: '230 W Kinzie St, Chicago, IL 60654',
    },
    {
      id: 'b-5',
      userId: 'u-mgr-2',
      name: 'The Purple Pig',
      type: 'restaurant' as const,
      city: 'Chicago, IL',
      address: '500 N Michigan Ave, Chicago, IL 60611',
    },
    {
      id: 'b-6',
      userId: 'u-mgr-3',
      name: 'Longman & Eagle',
      type: 'bar' as const,
      city: 'Chicago, IL',
      address: '2657 N Kedzie Ave, Chicago, IL 60647',
    },
    {
      id: 'b-7',
      userId: 'u-mgr-1',
      name: 'Avec',
      type: 'restaurant' as const,
      city: 'Chicago, IL',
      address: '615 W Randolph St, Chicago, IL 60661',
    },
    {
      id: 'b-8',
      userId: 'u-mgr-2',
      name: 'The Violet Hour',
      type: 'bar' as const,
      city: 'Chicago, IL',
      address: '1520 N Damen Ave, Chicago, IL 60622',
    },
  ];

  await app.db.insert(schema.businesses).values(businesses);
  app.logger.info('Inserted 8 businesses');

  // Insert worker profiles
  const workerProfiles = [
    {
      id: 'wp-1',
      userId: 'u-wrk-1',
      name: 'Carlos Rivera',
      phone: '312-555-0101',
      city: 'Chicago, IL',
      roles: ['Bartender', 'Server'],
      yearsExperience: 5,
      certifications: ['TIPS', 'ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 15,
      bio: 'Experienced bartender and server with 5 years in Chicago bars and restaurants. Fast, friendly, and reliable.',
      isAvailable: true,
      reliabilityScore: 92,
      isVerified: true,
      photoUrl: 'https://picsum.photos/seed/carlos/200/200',
    },
    {
      id: 'wp-2',
      userId: 'u-wrk-2',
      name: 'Tasha Williams',
      phone: '312-555-0102',
      city: 'Chicago, IL',
      roles: ['Server', 'Host'],
      yearsExperience: 3,
      certifications: ['ServSafe'],
      hasTransportation: false,
      preferredRadiusMiles: 10,
      bio: 'Friendly and professional server with a passion for hospitality. Great with guests.',
      isAvailable: true,
      reliabilityScore: 88,
      isVerified: true,
      photoUrl: 'https://picsum.photos/seed/tasha/200/200',
    },
    {
      id: 'wp-3',
      userId: 'u-wrk-3',
      name: 'Devon Park',
      phone: '312-555-0103',
      city: 'Chicago, IL',
      roles: ['Cook', 'Dishwasher'],
      yearsExperience: 7,
      certifications: ['ServSafe', 'Food Handler'],
      hasTransportation: true,
      preferredRadiusMiles: 20,
      bio: 'Line cook with 7 years experience in high-volume kitchens. Comfortable with all stations.',
      isAvailable: false,
      reliabilityScore: 95,
      isVerified: true,
      photoUrl: 'https://picsum.photos/seed/devon/200/200',
    },
    {
      id: 'wp-4',
      userId: 'u-wrk-4',
      name: 'Mia Chen',
      phone: '312-555-0104',
      city: 'Chicago, IL',
      roles: ['Bartender'],
      yearsExperience: 4,
      certifications: ['TIPS'],
      hasTransportation: true,
      preferredRadiusMiles: 12,
      bio: 'Craft cocktail bartender with 4 years experience. Specializes in upscale bar programs.',
      isAvailable: true,
      reliabilityScore: 79,
      isVerified: true,
      photoUrl: 'https://picsum.photos/seed/mia/200/200',
    },
    {
      id: 'wp-5',
      userId: 'u-wrk-5',
      name: 'Ricky Torres',
      phone: '312-555-0105',
      city: 'Chicago, IL',
      roles: ['Server', 'Event Staff'],
      yearsExperience: 2,
      certifications: ['ServSafe'],
      hasTransportation: false,
      preferredRadiusMiles: 8,
      bio: 'Energetic server and event staff. Quick learner, great team player.',
      isAvailable: true,
      reliabilityScore: 71,
      isVerified: false,
      photoUrl: 'https://picsum.photos/seed/ricky/200/200',
    },
    {
      id: 'wp-6',
      userId: 'u-wrk-6',
      name: 'Jade Murphy',
      phone: '312-555-0106',
      city: 'Chicago, IL',
      roles: ['Host', 'Event Staff'],
      yearsExperience: 1,
      certifications: [],
      hasTransportation: false,
      preferredRadiusMiles: 5,
      bio: 'New to the industry but eager to learn. Great communication skills and professional demeanor.',
      isAvailable: false,
      reliabilityScore: 65,
      isVerified: false,
      photoUrl: 'https://picsum.photos/seed/jade/200/200',
    },
    {
      id: 'wp-7',
      userId: 'u-wrk-7',
      name: 'Sam Okafor',
      phone: '312-555-0107',
      city: 'Chicago, IL',
      roles: ['Cook'],
      yearsExperience: 6,
      certifications: ['ServSafe', 'Food Handler'],
      hasTransportation: true,
      preferredRadiusMiles: 18,
      bio: 'Experienced cook specializing in American and fusion cuisine. Reliable and hardworking.',
      isAvailable: true,
      reliabilityScore: 90,
      isVerified: true,
      photoUrl: 'https://picsum.photos/seed/sam/200/200',
    },
    {
      id: 'wp-8',
      userId: 'u-wrk-8',
      name: 'Lily Nguyen',
      phone: '312-555-0108',
      city: 'Chicago, IL',
      roles: ['Bartender', 'Server', 'Host'],
      yearsExperience: 8,
      certifications: ['TIPS', 'ServSafe'],
      hasTransportation: true,
      preferredRadiusMiles: 25,
      bio: 'Versatile hospitality professional with 8 years across bars, restaurants, and events. Top-rated worker.',
      isAvailable: true,
      reliabilityScore: 97,
      isVerified: true,
      photoUrl: 'https://picsum.photos/seed/lily/200/200',
    },
  ];

  await app.db.insert(schema.workerProfiles).values(workerProfiles);
  app.logger.info('Inserted 8 worker profiles');

  // Calculate dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() + 3);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const thisWeekStr = thisWeek.toISOString().split('T')[0];

  // Insert shifts
  const shifts = [
    {
      id: 's-1',
      businessId: 'b-1',
      roleNeeded: 'Bartender',
      workersNeeded: 1,
      date: todayStr,
      startTime: '20:00',
      endTime: '02:00',
      hourlyPay: '22',
      location: '1420 N Milwaukee Ave, Chicago, IL',
      dressCode: 'Black shirt, dark jeans',
      experienceRequired: '2+ years bartending',
      certificationsRequired: [],
      notes: 'Need someone for Friday night rush. Black shirt, dark jeans.',
      urgency: 'tonight' as const,
      status: 'open' as const,
    },
    {
      id: 's-2',
      businessId: 'b-2',
      roleNeeded: 'Server',
      workersNeeded: 2,
      date: todayStr,
      startTime: '17:00',
      endTime: '23:00',
      hourlyPay: '18',
      location: '845 W Randolph St, Chicago, IL',
      dressCode: 'Business casual',
      experienceRequired: '1+ years serving',
      certificationsRequired: [],
      notes: 'Dinner service 5-11pm. Business casual.',
      urgency: 'tonight' as const,
      status: 'open' as const,
    },
    {
      id: 's-3',
      businessId: 'b-2',
      roleNeeded: 'Cook',
      workersNeeded: 1,
      date: tomorrowStr,
      startTime: '08:00',
      endTime: '15:00',
      hourlyPay: '20',
      location: '845 W Randolph St, Chicago, IL',
      dressCode: 'Chef whites provided',
      experienceRequired: '3+ years kitchen experience',
      certificationsRequired: ['ServSafe'],
      notes: 'Prep cook needed for Saturday brunch.',
      urgency: 'tomorrow' as const,
      status: 'open' as const,
    },
    {
      id: 's-4',
      businessId: 'b-3',
      roleNeeded: 'Event Staff',
      workersNeeded: 4,
      date: thisWeekStr,
      startTime: '16:00',
      endTime: '23:00',
      hourlyPay: '17',
      location: '301 E Cermak Rd, Chicago, IL',
      dressCode: 'All black attire',
      experienceRequired: 'Any event experience',
      certificationsRequired: [],
      notes: 'Corporate event, 200 guests. All black attire.',
      urgency: 'this_week' as const,
      status: 'open' as const,
    },
    {
      id: 's-5',
      businessId: 'b-1',
      roleNeeded: 'Bartender',
      workersNeeded: 1,
      date: todayStr,
      startTime: '19:00',
      endTime: '01:00',
      hourlyPay: '25',
      location: '1420 N Milwaukee Ave, Chicago, IL',
      dressCode: 'All black',
      experienceRequired: '3+ years bartending',
      certificationsRequired: ['TIPS'],
      notes: 'VIP event, TIPS cert required.',
      urgency: 'tonight' as const,
      status: 'filled' as const,
    },
    {
      id: 's-6',
      businessId: 'b-2',
      roleNeeded: 'Server',
      workersNeeded: 1,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '16:00',
      hourlyPay: '18',
      location: '845 W Randolph St, Chicago, IL',
      dressCode: 'Business casual',
      experienceRequired: '1+ years',
      certificationsRequired: [],
      notes: 'Brunch service.',
      urgency: 'tomorrow' as const,
      status: 'filled' as const,
    },
    {
      id: 's-7',
      businessId: 'b-3',
      roleNeeded: 'Host',
      workersNeeded: 1,
      date: thisWeekStr,
      startTime: '18:00',
      endTime: '23:00',
      hourlyPay: '16',
      location: '301 E Cermak Rd, Chicago, IL',
      dressCode: 'Formal attire',
      experienceRequired: 'Hosting experience preferred',
      certificationsRequired: [],
      notes: 'Gala event hosting.',
      urgency: 'this_week' as const,
      status: 'completed' as const,
    },
    {
      id: 's-8',
      businessId: 'b-1',
      roleNeeded: 'Dishwasher',
      workersNeeded: 1,
      date: todayStr,
      startTime: '18:00',
      endTime: '00:00',
      hourlyPay: '15',
      location: '1420 N Milwaukee Ave, Chicago, IL',
      dressCode: 'Casual',
      experienceRequired: 'None required',
      certificationsRequired: [],
      notes: 'Immediate need, no experience required.',
      urgency: 'tonight' as const,
      status: 'open' as const,
    },
    {
      id: 's-9',
      businessId: 'b-4',
      roleNeeded: 'Bartender',
      workersNeeded: 2,
      date: todayStr,
      startTime: '18:00',
      endTime: '02:00',
      hourlyPay: '26',
      location: '230 W Kinzie St, Chicago, IL',
      dressCode: 'All black',
      experienceRequired: '3+ years craft cocktails',
      certificationsRequired: ['TIPS'],
      notes: 'Upscale cocktail bar, craft cocktail experience required.',
      urgency: 'tonight' as const,
      status: 'open' as const,
    },
    {
      id: 's-10',
      businessId: 'b-5',
      roleNeeded: 'Server',
      workersNeeded: 3,
      date: tomorrowStr,
      startTime: '11:00',
      endTime: '17:00',
      hourlyPay: '19',
      location: '500 N Michigan Ave, Chicago, IL',
      dressCode: 'Business casual',
      experienceRequired: '2+ years fine dining',
      certificationsRequired: [],
      notes: 'Busy lunch service on the Mag Mile.',
      urgency: 'tomorrow' as const,
      status: 'open' as const,
    },
    {
      id: 's-11',
      businessId: 'b-6',
      roleNeeded: 'Bartender',
      workersNeeded: 1,
      date: thisWeekStr,
      startTime: '17:00',
      endTime: '01:00',
      hourlyPay: '24',
      location: '2657 N Kedzie Ave, Chicago, IL',
      dressCode: 'Smart casual',
      experienceRequired: '2+ years bar experience',
      certificationsRequired: ['TIPS'],
      notes: 'Whiskey-focused gastropub. Knowledge of spirits a plus.',
      urgency: 'this_week' as const,
      status: 'open' as const,
    },
    {
      id: 's-12',
      businessId: 'b-7',
      roleNeeded: 'Cook',
      workersNeeded: 1,
      date: todayStr,
      startTime: '14:00',
      endTime: '22:00',
      hourlyPay: '23',
      location: '615 W Randolph St, Chicago, IL',
      dressCode: 'Chef whites provided',
      experienceRequired: '3+ years Mediterranean cuisine',
      certificationsRequired: ['ServSafe'],
      notes: 'Mediterranean small plates kitchen. Fast-paced dinner service.',
      urgency: 'tonight' as const,
      status: 'open' as const,
    },
    {
      id: 's-13',
      businessId: 'b-8',
      roleNeeded: 'Host',
      workersNeeded: 1,
      date: tomorrowStr,
      startTime: '19:00',
      endTime: '02:00',
      hourlyPay: '17',
      location: '1520 N Damen Ave, Chicago, IL',
      dressCode: 'Formal attire required',
      experienceRequired: 'Hosting experience preferred',
      certificationsRequired: [],
      notes: 'Speakeasy-style cocktail bar. Professional appearance essential.',
      urgency: 'tomorrow' as const,
      status: 'open' as const,
    },
  ];

  await app.db.insert(schema.shifts).values(shifts);
  app.logger.info('Inserted 13 shifts');

  // Insert shift applications
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  const shiftApplications = [
    {
      id: 'sa-1',
      shiftId: 's-1',
      workerId: 'wp-1',
      status: 'pending' as const,
      appliedAt: now,
      confirmedAt: null,
    },
    {
      id: 'sa-2',
      shiftId: 's-2',
      workerId: 'wp-2',
      status: 'pending' as const,
      appliedAt: now,
      confirmedAt: null,
    },
    {
      id: 'sa-3',
      shiftId: 's-5',
      workerId: 'wp-8',
      status: 'confirmed' as const,
      appliedAt: twoHoursAgo,
      confirmedAt: oneHourAgo,
    },
    {
      id: 'sa-4',
      shiftId: 's-6',
      workerId: 'wp-3',
      status: 'confirmed' as const,
      appliedAt: threeDaysAgo,
      confirmedAt: twoDaysAgo,
    },
    {
      id: 'sa-5',
      shiftId: 's-7',
      workerId: 'wp-6',
      status: 'confirmed' as const,
      appliedAt: oneDayAgo,
      confirmedAt: twentyHoursAgo,
    },
  ];

  await app.db.insert(schema.shiftApplications).values(shiftApplications);
  app.logger.info('Inserted 5 shift applications');

  // Insert ratings
  const ratings = [
    {
      id: 'r-1',
      shiftId: 's-7',
      workerId: 'wp-6',
      managerId: 'u-mgr-3',
      score: 4,
      comment: 'Great attitude, arrived on time.',
      createdAt: now,
    },
  ];

  await app.db.insert(schema.ratings).values(ratings);
  app.logger.info('Inserted 1 rating');

  // Insert certifications
  const certifications = [
    {
      id: 'c-1',
      name: 'TIPS',
      description: 'Training for Intervention ProcedureS - responsible alcohol service certification',
    },
    {
      id: 'c-2',
      name: 'ServSafe',
      description: 'Food safety certification from the National Restaurant Association',
    },
    {
      id: 'c-3',
      name: 'Food Handler',
      description: 'Basic food handler safety certification',
    },
  ];

  await app.db.insert(schema.certifications).values(certifications);
  app.logger.info('Inserted 3 certifications');

  // Insert notifications
  const notifications = [
    {
      id: 'n-1',
      userId: 'u-wrk-1',
      title: 'New shift near you!',
      body: 'A Bartender shift at The Rusty Anchor is available tonight for $22/hr.',
      type: 'shift_posted' as const,
      read: false,
      shiftId: 's-1',
      createdAt: now,
    },
    {
      id: 'n-2',
      userId: 'u-wrk-1',
      title: 'Your application was received',
      body: 'Your application for the Bartender shift at The Rusty Anchor has been received.',
      type: 'shift_accepted' as const,
      read: true,
      shiftId: 's-1',
      createdAt: now,
    },
  ];

  await app.db.insert(schema.notifications).values(notifications);
  app.logger.info('Inserted 2 notifications');

  app.logger.info('Database seeding completed successfully');
}
