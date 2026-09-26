/**
 * Remplit la base avec les données de référence du Bac (src/content/bac.ts).
 * Idempotent : vide les tables de la vitrine puis les recharge.
 *
 *   pnpm db:push   # crée les tables
 *   pnpm db:seed   # charge les données
 */
import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import {
  CALENDAR,
  DOSSIER_ITEMS,
  FAQS,
  FEES,
  NEWS,
  SERIE_SUBJECTS,
  SERIES,
  SOURCES,
  SUBJECTS,
  TIPS,
} from "../content/bac";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (voir .env.example).");

  // `Pool` (WebSocket) et non `neon()` (HTTP) : le seed a besoin d'une
  // transaction interactive — il lit les `returning()` des subjects pour
  // alimenter serie_subjects — et ni `drizzle-orm/neon-http` ni la fonction
  // HTTP n'en acceptent une. Le port 5432 étant injoignable depuis ce réseau,
  // les deux pilotes passent par le 443.
  const client = new Pool({ connectionString: url });
  const db = drizzle({ client, schema });

  await db.transaction(async (tx) => {
    // Ordre inverse des clés étrangères.
    await tx.delete(schema.serieSubjects);
    await tx.delete(schema.news);
    await tx.delete(schema.calendarEvents);
    await tx.delete(schema.registrationFees);
    await tx.delete(schema.dossierItems);
    await tx.delete(schema.tips);
    await tx.delete(schema.faqs);
    await tx.delete(schema.subjects);
    await tx.delete(schema.series);
    await tx.delete(schema.examSessions);
    await tx.delete(schema.sources);

    await tx.insert(schema.sources).values(Object.entries(SOURCES).map(([key, s]) => ({ key, ...s })));
    await tx.insert(schema.examSessions).values([
      { year: 2026, isCurrent: false },
      { year: 2027, isCurrent: true },
    ]);
    await tx.insert(schema.series).values(SERIES);

    const insertedSubjects = await tx.insert(schema.subjects).values(SUBJECTS).returning();
    const subjectId = new Map(insertedSubjects.map((s) => [s.code, s.id]));
    await tx.insert(schema.serieSubjects).values(
      SERIE_SUBJECTS.map((ss) => ({
        serieCode: ss.serieCode,
        subjectId: subjectId.get(ss.subjectCode)!,
        coefficient: ss.coefficient,
        isCore: ss.isCore,
        isConfirmed: ss.confirmed,
        note: ss.note ?? null,
      })),
    );

    await tx
      .insert(schema.registrationFees)
      .values(FEES.map(({ source, ...f }) => ({ ...f, sourceKey: source })));
    await tx
      .insert(schema.dossierItems)
      .values(DOSSIER_ITEMS.map(({ confirmed, ...d }) => ({ ...d, isConfirmed: confirmed })));
    await tx.insert(schema.calendarEvents).values(
      CALENDAR.map(({ confirmed, source, ...c }) => ({
        ...c,
        endsOn: c.endsOn ?? null,
        isConfirmed: confirmed,
        sourceKey: source,
      })),
    );
    await tx.insert(schema.tips).values(TIPS);
    await tx.insert(schema.faqs).values(FAQS);
    await tx.insert(schema.news).values(
      NEWS.map(({ source, publishedAt, ...n }) => ({
        ...n,
        sourceKey: source,
        publishedAt: new Date(publishedAt),
      })),
    );
  });

  console.log("✓ Données du Bac chargées.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
