CREATE TYPE "public"."assignment_status" AS ENUM('assigned', 'checked_in', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('id_front', 'id_back', 'food_handler', 'liquor_license', 'certification', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_category" AS ENUM('account', 'shift', 'payment', 'technical', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."worker_role" AS ENUM('bartender', 'server', 'cook', 'dishwasher', 'event_staff', 'security', 'barback', 'host', 'runner', 'busser');--> statement-breakpoint
ALTER TYPE "public"."business_type" ADD VALUE 'hotel';--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "document_type" NOT NULL,
	"url" text NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text,
	"phone" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"shift_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "assignment_status" DEFAULT 'assigned' NOT NULL,
	"check_in_time" timestamp with time zone,
	"check_out_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'medium' NOT NULL,
	"category" "support_ticket_category" NOT NULL,
	"admin_notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"worker_id" text NOT NULL,
	"name" text NOT NULL,
	"issuing_org" text NOT NULL,
	"issued_date" text,
	"expiry_date" text,
	"document_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"worker_id" text NOT NULL,
	"role" "worker_role" NOT NULL,
	"years_experience" integer,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb DEFAULT '{"shift_alerts":true,"application_updates":true,"reminders":true,"marketing":false}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "availability_days" text[];--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "availability_start" text;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "availability_end" text;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DELETE FROM "documents" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "manager_profiles" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "manager_profiles" ADD CONSTRAINT "manager_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "manager_profiles" WHERE "business_id" IS NOT NULL AND "business_id" NOT IN (SELECT "id" FROM "businesses");--> statement-breakpoint
ALTER TABLE "manager_profiles" ADD CONSTRAINT "manager_profiles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DELETE FROM "shift_assignments" WHERE "shift_id" NOT IN (SELECT "id" FROM "shifts");--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "shift_assignments" WHERE "worker_id" NOT IN (SELECT "id" FROM "worker_profiles");--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_worker_id_worker_profiles_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "support_tickets" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "worker_certifications" WHERE "worker_id" NOT IN (SELECT "id" FROM "worker_profiles");--> statement-breakpoint
ALTER TABLE "worker_certifications" ADD CONSTRAINT "worker_certifications_worker_id_worker_profiles_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "worker_roles" WHERE "worker_id" NOT IN (SELECT "id" FROM "worker_profiles");--> statement-breakpoint
ALTER TABLE "worker_roles" ADD CONSTRAINT "worker_roles_worker_id_worker_profiles_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "businesses" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "notifications" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM "worker_profiles" WHERE "user_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_profiles" DROP COLUMN "roles";--> statement-breakpoint
ALTER TABLE "worker_profiles" DROP COLUMN "years_experience";--> statement-breakpoint
ALTER TABLE "worker_profiles" DROP COLUMN "certifications";