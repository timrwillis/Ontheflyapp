ALTER TABLE "shifts" ALTER COLUMN "urgency" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."shift_urgency";--> statement-breakpoint
CREATE TYPE "public"."shift_urgency" AS ENUM('emergency', 'tonight', 'high', 'tomorrow', 'this_week', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "urgency" SET DATA TYPE "public"."shift_urgency" USING "urgency"::"public"."shift_urgency";--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "workers_confirmed" integer DEFAULT 0 NOT NULL;