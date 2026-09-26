CREATE TABLE "mobile_revision_sessions" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"subject_id" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"progress" smallint NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_revision_sessions_progress_check" CHECK ("progress" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "mobile_revision_sessions" ADD CONSTRAINT "mobile_revision_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "mobile_revision_sessions" ADD CONSTRAINT "mobile_revision_sessions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "mobile_revision_sessions" ADD CONSTRAINT "mobile_revision_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
CREATE INDEX "mobile_revision_sessions_candidate_id_received_at_index" ON "mobile_revision_sessions" USING btree ("candidate_id","received_at");
