import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
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
  'hotel',
]);

export const shiftUrgencyEnum = pgEnum('shift_urgency', [
  'emergency',
  'tonight',
  'high',
  'tomorrow',
  'this_week',
  'medium',
  'low',
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

export const workerRoleEnum = pgEnum('worker_role', [
  'bartender',
  'server',
  'cook',
  'dishwasher',
  'event_staff',
  'security',
  'barback',
  'host',
  'runner',
  'busser',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'id_front',
  'id_back',
  'food_handler',
  'liquor_license',
  'certification',
  'other',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'pending',
  'approved',
  'rejected',
]);

export const supportTicketStatusEnum = pgEnum('support_ticket_status', [
  'open',
  'in_progress',
  'resolved',
  'closed',
]);

export const supportTicketPriorityEnum = pgEnum('support_ticket_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const supportTicketCategoryEnum = pgEnum('support_ticket_category', [
  'account',
  'shift',
  'payment',
  'technical',
  'other',
  'general',
]);

export const assignmentStatusEnum = pgEnum('assignment_status', [
  'assigned',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
]);

// Tables
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull(),
  onboardingStep: integer('onboarding_step').default(0).notNull(),
  profileCompleted: boolean('profile_completed').default(false).notNull(),
  notificationPreferences: jsonb('notification_preferences').default({
    shift_alerts: true,
    application_updates: true,
    reminders: true,
    marketing: false,
  }).notNull(),
  agreedToTerms: boolean('agreed_to_terms').default(false).notNull(),
  agreedAt: timestamp('agreed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: businessTypeEnum('type').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  description: text('description'),
  website: text('website'),
  logoUrl: text('logo_url'),
  isVerified: boolean('is_verified').default(false).notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const managerProfiles = pgTable('manager_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessId: text('business_id').references(() => businesses.id, { onDelete: 'set null' }),
  phone: text('phone'),
  isVerified: boolean('is_verified').default(false).notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workerProfiles = pgTable('worker_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  bio: text('bio'),
  hasTransportation: boolean('has_transportation').default(false).notNull(),
  preferredRadiusMiles: integer('preferred_radius_miles'),
  availabilityDays: text('availability_days').array(),
  availabilityStart: text('availability_start'),
  availabilityEnd: text('availability_end'),
  isAvailable: boolean('is_available').default(false).notNull(),
  reliabilityScore: integer('reliability_score').default(75).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
  responseTimeMinutes: integer('response_time_minutes'),
  distanceMiles: numeric('distance_miles', { precision: 4, scale: 1 }),
  avgRating: numeric('avg_rating', { precision: 3, scale: 2 }),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workerRoles = pgTable('worker_roles', {
  id: text('id').primaryKey(),
  workerId: text('worker_id').notNull().references(() => workerProfiles.id, { onDelete: 'cascade' }),
  role: workerRoleEnum('role').notNull(),
  yearsExperience: integer('years_experience'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workerCertifications = pgTable('worker_certifications', {
  id: text('id').primaryKey(),
  workerId: text('worker_id').notNull().references(() => workerProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  issuingOrg: text('issuing_org').notNull(),
  issuedDate: text('issued_date'),
  expiryDate: text('expiry_date'),
  documentUrl: text('document_url'),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shifts = pgTable('shifts', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  roleNeeded: text('role_needed').notNull(),
  workersNeeded: integer('workers_needed').default(1).notNull(),
  workersConfirmed: integer('workers_confirmed').default(0).notNull(),
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

export const shiftAssignments = pgTable('shift_assignments', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  workerId: text('worker_id').notNull().references(() => workerProfiles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  status: assignmentStatusEnum('status').default('assigned').notNull(),
  checkInTime: timestamp('check_in_time', { withTimezone: true }),
  checkOutTime: timestamp('check_out_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull(),
  url: text('url').notNull(),
  status: documentStatusEnum('status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const supportTickets = pgTable('support_tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: supportTicketStatusEnum('status').default('open').notNull(),
  priority: supportTicketPriorityEnum('priority').default('medium').notNull(),
  category: supportTicketCategoryEnum('category').notNull(),
  adminNotes: text('admin_notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certifications = pgTable('certifications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: notificationTypeEnum('type').notNull(),
  read: boolean('read').default(false).notNull(),
  shiftId: text('shift_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
