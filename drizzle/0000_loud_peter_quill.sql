CREATE TYPE "public"."calendar_kind" AS ENUM('inscription', 'examen', 'resultats', 'reforme');--> statement-breakpoint
CREATE TYPE "public"."candidate_type" AS ENUM('tous', 'ecole', 'libre', 'etranger');--> statement-breakpoint
CREATE TYPE "public"."news_importance" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."tip_category" AS ENUM('preparer', 'jour_j', 'apres');--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_year" integer NOT NULL,
	"title" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"date_label" text NOT NULL,
	"kind" "calendar_kind" NOT NULL,
	"is_confirmed" boolean DEFAULT true NOT NULL,
	"source_key" text
);
--> statement-breakpoint
CREATE TABLE "dossier_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"detail" text NOT NULL,
	"candidate_type" "candidate_type" NOT NULL,
	"icon" text NOT NULL,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exam_sessions_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"importance" "news_importance" DEFAULT 'normal' NOT NULL,
	"illustration" text NOT NULL,
	"source_key" text,
	"author_id" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "registration_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_year" integer NOT NULL,
	"candidate_type" "candidate_type" NOT NULL,
	"label" text NOT NULL,
	"amount_ariary" integer NOT NULL,
	"source_key" text
);
--> statement-breakpoint
CREATE TABLE "serie_subjects" (
	"serie_code" text NOT NULL,
	"subject_id" integer NOT NULL,
	"coefficient" numeric(3, 1) NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL,
	"is_confirmed" boolean DEFAULT true NOT NULL,
	"note" text,
	CONSTRAINT "serie_subjects_serie_code_subject_id_pk" PRIMARY KEY("serie_code","subject_id")
);
--> statement-breakpoint
CREATE TABLE "series" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_mg" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"for_whom" text[] NOT NULL,
	"careers" text[] NOT NULL,
	"former_options" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_mg" text NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "tip_category" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_source_key_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_source_key_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_fees" ADD CONSTRAINT "registration_fees_source_key_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serie_subjects" ADD CONSTRAINT "serie_subjects_serie_code_series_code_fk" FOREIGN KEY ("serie_code") REFERENCES "public"."series"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serie_subjects" ADD CONSTRAINT "serie_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;