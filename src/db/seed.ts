/**
 * Remplit la base avec les données de référence du Bac (src/content/bac.ts).
 * Idempotent : met à jour le référentiel et recharge les contenus du guide.
 *
 *   pnpm db:push   # crée les tables
 *   pnpm db:seed   # charge les données
 */
import "dotenv/config";
import "./network";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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

  const client = postgres(url, { prepare: false, max: 1, connect_timeout: 30 });
  const db = drizzle(client, { schema });

  await db.transaction(async (tx) => {
    // Tables de référence : mise à jour sans suppression (candidats, notes et
    // épreuves y font référence).
    for (const [key, src] of Object.entries(SOURCES)) {
      await tx
        .insert(schema.sources)
        .values({ key, ...src })
        .onConflictDoUpdate({ target: schema.sources.key, set: src });
    }
    for (const year of [2026, 2027]) {
      await tx
        .insert(schema.examSessions)
        .values({ year, isCurrent: year === 2027 })
        .onConflictDoUpdate({ target: schema.examSessions.year, set: { isCurrent: year === 2027 } });
    }
    for (const s of SERIES) {
      await tx.insert(schema.series).values(s).onConflictDoUpdate({ target: schema.series.code, set: s });
    }
    for (const s of SUBJECTS) {
      await tx.insert(schema.subjects).values(s).onConflictDoUpdate({ target: schema.subjects.code, set: s });
    }
    const subjectRows = await tx.select().from(schema.subjects);
    const subjectId = new Map(subjectRows.map((s) => [s.code, s.id]));
    for (const ss of SERIE_SUBJECTS) {
      const row = {
        serieCode: ss.serieCode,
        subjectId: subjectId.get(ss.subjectCode)!,
        coefficient: ss.coefficient,
        isCore: ss.isCore,
        isConfirmed: ss.confirmed,
        note: ss.note ?? null,
      };
      await tx
        .insert(schema.serieSubjects)
        .values(row)
        .onConflictDoUpdate({
          target: [schema.serieSubjects.serieCode, schema.serieSubjects.subjectId],
          set: {
            coefficient: row.coefficient,
            isCore: row.isCore,
            isConfirmed: row.isConfirmed,
            note: row.note,
          },
        });
    }

    // Contenus éditoriaux du guide : rechargés entièrement.
    await tx.delete(schema.calendarEvents);
    await tx.delete(schema.registrationFees);
    await tx.delete(schema.dossierItems);
    await tx.delete(schema.tips);
    await tx.delete(schema.faqs);

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

    // Actualités de référence : ajoutées si absentes (celles publiées par l'Admin restent).
    for (const { source, publishedAt, ...n } of NEWS) {
      await tx
        .insert(schema.news)
        .values({ ...n, sourceKey: source, publishedAt: new Date(publishedAt) })
        .onConflictDoNothing({ target: schema.news.slug });
    }
  });

  console.log("✓ Données du Bac chargées.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
