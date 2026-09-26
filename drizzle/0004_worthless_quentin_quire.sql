ALTER TABLE "scans" ADD COLUMN "synced_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "clock_drift_seconds" integer;