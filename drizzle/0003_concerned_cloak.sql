CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'incomplete', 'rejected', 'validated');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'school';--> statement-breakpoint
CREATE TABLE "application_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"count" integer NOT NULL,
	"sent_by" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"batch_id" integer,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"birth_date" date NOT NULL,
	"birth_place" text NOT NULL,
	"gender" text NOT NULL,
	"address" text NOT NULL,
	"serie_code" text NOT NULL,
	"cin" text,
	"phone" text,
	"email" text,
	"photo_mime" text,
	"photo" "bytea",
	"pieces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"candidate_id" uuid,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'public' NOT NULL,
	"commune" text NOT NULL,
	"address" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "review_status" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "proposed_by" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "proposed_by_label" text;--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "track" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "application_batches" ADD CONSTRAINT "application_batches_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_batches" ADD CONSTRAINT "application_batches_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_batches" ADD CONSTRAINT "application_batches_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_batch_id_application_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."application_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_serie_code_series_code_fk" FOREIGN KEY ("serie_code") REFERENCES "public"."series"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_school_id_status_index" ON "applications" USING btree ("school_id","status");--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;