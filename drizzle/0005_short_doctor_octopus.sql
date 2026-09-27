CREATE TYPE "public"."coaching_status" AS ENUM('pending_payment', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."learning_kind" AS ENUM('course', 'training', 'coaching');--> statement-breakpoint
CREATE TYPE "public"."learning_payment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."learning_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('candidate', 'teacher');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'teacher';--> statement-breakpoint
CREATE TABLE "coaching_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"sender" "message_sender" NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"candidate_user_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"payment_id" uuid,
	"status" "coaching_status" DEFAULT 'pending_payment' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "learning_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "learning_kind" NOT NULL,
	"subject_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"price_amount" integer,
	"duration_minutes" integer,
	"status" "learning_status" DEFAULT 'draft' NOT NULL,
	"review_note" text,
	"author_id" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "learning_payment_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text NOT NULL,
	"value" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_pk" PRIMARY KEY("key")
);
--> statement-breakpoint
CREATE TABLE "revision_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_code" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"progress" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coaching_messages" ADD CONSTRAINT "coaching_messages_session_id_coaching_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."coaching_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_messages" ADD CONSTRAINT "coaching_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_item_id_learning_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."learning_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_candidate_user_id_users_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_payment_id_learning_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."learning_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_payments" ADD CONSTRAINT "learning_payments_item_id_learning_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."learning_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_payments" ADD CONSTRAINT "learning_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_payments" ADD CONSTRAINT "learning_payments_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD CONSTRAINT "revision_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coaching_messages_session_id_created_at_index" ON "coaching_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "coaching_sessions_candidate_user_id_index" ON "coaching_sessions" USING btree ("candidate_user_id");--> statement-breakpoint
CREATE INDEX "coaching_sessions_teacher_id_status_index" ON "coaching_sessions" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "learning_items_status_subject_id_index" ON "learning_items" USING btree ("status","subject_id");--> statement-breakpoint
CREATE INDEX "learning_items_author_id_index" ON "learning_items" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_payments_reference_index" ON "learning_payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "learning_payments_user_id_item_id_index" ON "learning_payments" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "learning_payments_status_index" ON "learning_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "revision_sessions_user_id_started_at_index" ON "revision_sessions" USING btree ("user_id","started_at");