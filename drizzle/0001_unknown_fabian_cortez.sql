CREATE TYPE "public"."candidate_kind" AS ENUM('ecole', 'libre');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('active', 'admitted', 'failed', 'fraud', 'absent', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."decision_type" AS ENUM('admitted', 'failed', 'fraud', 'absent');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('transcript', 'diploma');--> statement-breakpoint
CREATE TYPE "public"."mention_type" AS ENUM('passable', 'assez_bien', 'bien', 'tres_bien');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('mvola', 'orange_money', 'airtel_money', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'validated', 'pickup_scheduled', 'delivered', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."scan_type" AS ENUM('entry', 'exit', 'return', 'end', 'fraud', 'doc_delivery');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'office', 'supervisor', 'candidate');--> statement-breakpoint
CREATE SEQUENCE "public"."candidate_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."request_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"table_name" text,
	"record_id" text,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"starts_at" date DEFAULT now() NOT NULL,
	"ends_at" date,
	"added_by" uuid NOT NULL,
	"lifted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_photos" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"office_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"matricule" text NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"birth_date" date NOT NULL,
	"birth_place" text NOT NULL,
	"gender" text NOT NULL,
	"cin" text,
	"phone" text,
	"email" text,
	"school_name" text,
	"kind" "candidate_kind" DEFAULT 'ecole' NOT NULL,
	"serie_code" text NOT NULL,
	"center_id" integer,
	"room_id" integer,
	"seat_number" integer,
	"qr_token" text NOT NULL,
	"temp_password_enc" text,
	"status" "candidate_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "candidates_matricule_unique" UNIQUE("matricule"),
	CONSTRAINT "candidates_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"candidate_id" uuid NOT NULL,
	"type" "doc_type" NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"pickup_at" timestamp with time zone,
	"pickup_place" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"delivered_at" timestamp with time zone,
	"delivered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_requests_number_unique" UNIQUE("number"),
	CONSTRAINT "document_requests_candidate_id_type_unique" UNIQUE("candidate_id","type")
);
--> statement-breakpoint
CREATE TABLE "exam_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"office_id" integer NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"serie_code" text NOT NULL,
	"subject_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exams_session_id_serie_code_subject_id_unique" UNIQUE("session_id","serie_code","subject_id")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"candidate_id" uuid NOT NULL,
	"subject_id" integer NOT NULL,
	"score" numeric(4, 2) NOT NULL,
	"entered_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grades_candidate_id_subject_id_pk" PRIMARY KEY("candidate_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"university" text NOT NULL,
	"city" text NOT NULL,
	"address" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text NOT NULL,
	"amount" integer NOT NULL,
	"receipt_mime" text NOT NULL,
	"receipt" "bytea" NOT NULL,
	"ticket_number" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "payments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payments_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"average" numeric(5, 2),
	"mention" "mention_type",
	"decision" "decision_type" NOT NULL,
	"deliberated_by" uuid,
	"deliberated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"center_id" integer NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	CONSTRAINT "rooms_center_id_name_unique" UNIQUE("center_id","name")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"exam_id" integer,
	"room_id" integer,
	"request_id" uuid,
	"scanned_by" uuid NOT NULL,
	"type" "scan_type" NOT NULL,
	"comment" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisor_rooms" (
	"supervisor_id" uuid NOT NULL,
	"room_id" integer NOT NULL,
	CONSTRAINT "supervisor_rooms_supervisor_id_room_id_pk" PRIMARY KEY("supervisor_id","room_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"office_id" integer,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_attempts" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "exams_start" date;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "exams_end" date;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "results_publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "admission_threshold" numeric(4, 2) DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "transcript_delay_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "transcript_fee" integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "diploma_fee" integer DEFAULT 20000 NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_sessions" ADD COLUMN "account_disable_days" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_photos" ADD CONSTRAINT "candidate_photos_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_serie_code_series_code_fk" FOREIGN KEY ("serie_code") REFERENCES "public"."series"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_center_id_exam_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."exam_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_delivered_by_users_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_centers" ADD CONSTRAINT "exam_centers_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_serie_code_series_code_fk" FOREIGN KEY ("serie_code") REFERENCES "public"."series"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_request_id_document_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_deliberated_by_users_id_fk" FOREIGN KEY ("deliberated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_center_id_exam_centers_id_fk" FOREIGN KEY ("center_id") REFERENCES "public"."exam_centers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_rooms" ADD CONSTRAINT "supervisor_rooms_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_rooms" ADD CONSTRAINT "supervisor_rooms_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_index" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_table_name_record_id_index" ON "audit_logs" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_index" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "candidates_last_name_first_name_birth_date_index" ON "candidates" USING btree ("last_name","first_name","birth_date");--> statement-breakpoint
CREATE INDEX "candidates_office_id_serie_code_index" ON "candidates" USING btree ("office_id","serie_code");--> statement-breakpoint
CREATE INDEX "candidates_room_id_index" ON "candidates" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scans_exam_id_candidate_id_type_index" ON "scans" USING btree ("exam_id","candidate_id","type");