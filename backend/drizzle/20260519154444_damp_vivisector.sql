ALTER TABLE "users" ADD COLUMN "agreed_to_terms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agreed_at" timestamp with time zone;