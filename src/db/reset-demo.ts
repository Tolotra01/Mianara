/**
 * Remet la gestion à zéro puis recharge le jeu de démonstration.
 * Efface comptes, candidats, épreuves, notes, demandes, notifications et journal ;
 * le référentiel et les contenus de la vitrine sont conservés.
 *
 *   pnpm db:reset-demo
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { requireDb } from "./index";

async function main() {
  const db = requireDb();
  await db.execute(sql`
    truncate table coaching_messages, coaching_sessions, learning_payments, learning_items, teachers,
      revision_sessions, platform_settings, audit_logs, notifications, payments, document_requests, blacklist, results, grades,
      scans, supervisor_rooms, exams, applications, application_batches, candidate_photos, candidates,
      auth_sessions, rooms, exam_centers, users, schools, offices restart identity cascade
  `);
  await db.execute(sql`alter sequence candidate_number_seq restart with 1`);
  await db.execute(sql`alter sequence request_number_seq restart with 1`);
  await db.execute(sql`update exam_sessions set results_publish_at = null, transcript_delay_days = 7`);
  await db.execute(sql`delete from news where proposed_by is not null`);
  await db.execute(sql`update news set author_id = null where author_id is not null`);
  console.log("✓ Gestion remise à zéro.");
  await import("./seed-demo");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
