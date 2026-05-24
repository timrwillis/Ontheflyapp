ALTER TABLE "worker_profiles" ADD COLUMN "response_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "distance_miles" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD COLUMN "avg_rating" numeric(3, 2);