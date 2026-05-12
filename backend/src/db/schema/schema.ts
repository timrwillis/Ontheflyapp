import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  varchar,
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'manager',
  'worker',
  'admin',
]);

export const businessTypeEnum = pgEnum('business_type', [
  'restaurant',
  'bar',
  'catering',
  'venue',
]);

export const shiftUrgencyEnum = pgEnum('shift_urgency', [
  'tonight',
  'tomorrow',
  'this_week',
  'future',
]);

export const shiftStatusEnum = pgEnum('shift_status', [
  'open',
  'pending',
  'filled',
  'completed',
  'canceled',
  'no_show',
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'confirmed',
  'rejected',
  'canceled',
  'no_show',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'shift_posted',
  'shift_accepted',
  'worker_confirmed',
  'reminder',
  'cancellation',
  'rating',
]);

// Tables
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: businessTypeEnum('type').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workerProfiles = pgTable('worker_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  roles: text('roles').array(),
  yearsExperience: integer('years_experience'),
  certifications: text('certifications').array(),
  hasTransportation: boolean('has_transportation').default(false).notNull(),
  preferredRadiusMiles: integer('preferred_radius_miles'),
  bio: text('bio'),
  isAvailable: boolean('is_available').default(false).notNull(),
  reliabilityScore: integer('reliability_score').default(75).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
  responseTimeMinutes: integer('response_time_minutes'),
  distanceMiles: numeric('distance_miles', { precision: 4, scale: 1 }),
  avgRating: numeric('avg_rating', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shifts = pgTable('shifts', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  roleNeeded: text('role_needed').notNull(),
  workersNeeded: integer('workers_needed').default(1).notNull(),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  hourlyPay: numeric('hourly_pay').notNull(),
  location: text('location').notNull(),
  dressCode: text('dress_code'),
  experienceRequired: text('experience_required'),
  certificationsRequired: text('certifications_required').array(),
  notes: text('notes'),
  urgency: shiftUrgencyEnum('urgency').notNull(),
  status: shiftStatusEnum('status').default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shiftApplications = pgTable('shift_applications', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  workerId: text('worker_id').notNull().references(() => workerProfiles.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').default('pending').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
});

export const ratings = pgTable('ratings', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  workerId: text('worker_id').notNull().references(() => workerProfiles.id, { onDelete: 'cascade' }),
  managerId: text('manager_id').notNull(),
  score: integer('score').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certifications = pgTable('certifications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: notificationTypeEnum('type').notNull(),
  read: boolean('read').default(false).notNull(),
  shiftId: text('shift_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
