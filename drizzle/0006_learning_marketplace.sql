ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'teacher';
--> statement-breakpoint
CREATE TYPE "teacher_verification_status" AS ENUM ('pending', 'verified', 'rejected');
--> statement-breakpoint
CREATE TYPE "teacher_document_kind" AS ENUM ('identity', 'qualification');
--> statement-breakpoint
CREATE TYPE "teacher_document_status" AS ENUM ('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "learning_kind" AS ENUM ('course', 'training', 'coaching');
--> statement-breakpoint
CREATE TYPE "learning_review_status" AS ENUM ('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "coaching_payment_status" AS ENUM ('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TABLE "teacher_profiles" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject_code" text NOT NULL REFERENCES "subjects"("code"),
  "verification_status" "teacher_verification_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" "teacher_document_kind" NOT NULL,
  "file_name" text NOT NULL,
  "mime" text NOT NULL,
  "data" bytea NOT NULL,
  "status" "teacher_document_status" DEFAULT 'pending' NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  CONSTRAINT "teacher_documents_teacher_kind_unique" UNIQUE("teacher_id", "kind")
);
--> statement-breakpoint
CREATE INDEX "teacher_documents_status_submitted_at_index" ON "teacher_documents" ("status", "submitted_at");
--> statement-breakpoint
CREATE TABLE "learning_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" "learning_kind" NOT NULL,
  "subject_code" text NOT NULL REFERENCES "subjects"("code"),
  "series" text[] NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "content" text NOT NULL,
  "price_amount" integer,
  "duration_minutes" integer,
  "review_status" "learning_review_status" DEFAULT 'pending' NOT NULL,
  "review_note" text,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "learning_listings_price_check" CHECK ("price_amount" IS NULL OR "price_amount" >= 0),
  CONSTRAINT "learning_listings_duration_check" CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0)
);
--> statement-breakpoint
CREATE INDEX "learning_listings_review_status_created_at_index" ON "learning_listings" ("review_status", "created_at");
--> statement-breakpoint
CREATE INDEX "learning_listings_teacher_id_created_at_index" ON "learning_listings" ("teacher_id", "created_at");
--> statement-breakpoint
CREATE TABLE "coaching_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "learning_listings"("id"),
  "candidate_id" uuid NOT NULL REFERENCES "candidates"("id") ON DELETE CASCADE,
  "transaction_reference" text NOT NULL UNIQUE,
  "amount" integer NOT NULL,
  "status" "coaching_payment_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "coaching_payments_amount_check" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE INDEX "coaching_payments_status_created_at_index" ON "coaching_payments" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "coaching_payments_candidate_id_listing_id_index" ON "coaching_payments" ("candidate_id", "listing_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "coaching_payments_one_open_per_candidate_listing" ON "coaching_payments" ("candidate_id", "listing_id") WHERE "status" IN ('pending', 'approved');
--> statement-breakpoint
CREATE TABLE "coaching_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL UNIQUE REFERENCES "coaching_payments"("id") ON DELETE CASCADE,
  "listing_id" uuid NOT NULL REFERENCES "learning_listings"("id"),
  "candidate_id" uuid NOT NULL REFERENCES "candidates"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending_payment' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "coaching_sessions_status_check" CHECK ("status" IN ('pending_payment', 'active'))
);
--> statement-breakpoint
CREATE INDEX "coaching_sessions_candidate_id_created_at_index" ON "coaching_sessions" ("candidate_id", "created_at");
--> statement-breakpoint
CREATE TABLE "coaching_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "coaching_sessions"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "coaching_messages_text_check" CHECK (length("text") BETWEEN 1 AND 4000)
);
--> statement-breakpoint
CREATE INDEX "coaching_messages_session_id_created_at_index" ON "coaching_messages" ("session_id", "created_at");
