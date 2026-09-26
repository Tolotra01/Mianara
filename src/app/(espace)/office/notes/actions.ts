"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { requireDb } from "@/db";
import { examSessions, serieSubjects } from "@/db/schema";
import { candidates, grades, results } from "@/db/schema-gestion";
import { type ActionState, fail, ok } from "@/lib/action";
import { audit, notifyMany } from "@/lib/audit";
import { requireOfficeAgent } from "@/lib/auth";
import { formatDateTime, parseLocalDateTime } from "@/lib/bac-rules";
import { currentSession } from "@/lib/services/candidates";
import { deliberate } from "@/lib/services/results";

const isPublished = (s: { resultsPublishAt: Date | null }) =>
  Boolean(s.resultsPublishAt && s.resultsPublishAt <= new Date());

/** Saisie des notes d'une matière (OFF-06). Verrouillée après publication (RG-09). */
export async function saveGrades(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const db = requireDb();
  const session = await currentSession(db);
  if (isPublished(session)) return fail("Résultats publiés : les notes sont verrouillées.");
  const subjectId = Number(form.get("subjectId"));
  const serie = String(form.get("serie"));
  const [inSerie] = await db
    .select()
    .from(serieSubjects)
    .where(and(eq(serieSubjects.serieCode, serie), eq(serieSubjects.subjectId, subjectId)));
  if (!inSerie) return fail("Matière invalide pour cette série.");

  const entries = [...form.entries()].filter(([k]) => k.startsWith("note:"));
  const ids = entries.map(([k]) => k.slice(5));
  const allowed = new Set(
    (
      await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(
          and(
            inArray(candidates.id, ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
            eq(candidates.officeId, user.officeId),
            eq(candidates.serieCode, serie),
          ),
        )
    ).map((c) => c.id),
  );

  const errors: Record<string, string> = {};
  const toSave: { candidateId: string; score: number }[] = [];
  const toClear: string[] = [];
  for (const [key, raw] of entries) {
    const id = key.slice(5);
    if (!allowed.has(id)) continue;
    const value = String(raw).trim().replace(",", ".");
    if (value === "") {
      toClear.push(id);
      continue;
    }
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 20 || Math.round(score * 100) !== score * 100) {
      errors[key] = "Note de 0 à 20 (2 décimales au plus).";
      continue;
    }
    toSave.push({ candidateId: id, score });
  }
  if (Object.keys(errors).length) return fail(`${Object.keys(errors).length} note(s) invalide(s).`, errors);

  await db.transaction(async (tx) => {
    for (const g of toSave) {
      await tx
        .insert(grades)
        .values({ ...g, subjectId, enteredBy: user.id, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [grades.candidateId, grades.subjectId],
          set: { score: g.score, enteredBy: user.id, updatedAt: new Date() },
        });
    }
    if (toClear.length)
      await tx
        .delete(grades)
        .where(and(eq(grades.subjectId, subjectId), inArray(grades.candidateId, toClear)));
    await audit(
      {
        actorId: user.id,
        action: "notes.saisir",
        table: "grades",
        newData: { serie, subjectId, saved: toSave.length, cleared: toClear.length },
      },
      tx,
    );
  });
  refresh();
  return ok(`${toSave.length} note(s) enregistrée(s).`);
}

export async function runDeliberation(): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const db = requireDb();
  const session = await currentSession(db);
  if (isPublished(session)) return fail("Résultats déjà publiés : la délibération est close.");
  const { total, byDecision } = await db.transaction((tx) =>
    deliberate(user.officeId, session.id, session.admissionThreshold, user.id, tx),
  );
  refresh();
  if (!total) return fail("Aucun candidat à délibérer.");
  return ok(
    `Délibération : ${byDecision.admitted} admis, ${byDecision.failed} ajournés, ${byDecision.absent} absents, ${byDecision.fraud} fraudes.`,
  );
}

/**
 * OFF-07 : programmation de la publication (ou publication immédiate).
 * Irréversible sans l'Administration. Les candidats sont prévenus à la publication.
 */
export async function publishResults(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const db = requireDb();
  const session = await currentSession(db);
  if (isPublished(session)) return fail("Les résultats sont déjà publiés.");
  const [{ n }] = await db
    .select({ n: count() })
    .from(results)
    .innerJoin(candidates, eq(candidates.id, results.candidateId))
    .where(eq(candidates.officeId, user.officeId));
  if (!n) return fail("Lancez d'abord la délibération.");

  const when = String(form.get("when") ?? "");
  const at = when ? parseLocalDateTime(when) : new Date();
  if (!at) return fail("Date de publication invalide.");
  if (when && at <= new Date()) return fail("Choisissez une date future, ou publiez maintenant.");

  await db.update(examSessions).set({ resultsPublishAt: at }).where(eq(examSessions.id, session.id));
  await audit({
    actorId: user.id,
    action: "resultats.publier",
    table: "exam_sessions",
    recordId: session.id,
    newData: { resultsPublishAt: at },
  });

  const people = await db
    .select({ userId: candidates.userId, decision: results.decision })
    .from(candidates)
    .innerJoin(results, eq(results.candidateId, candidates.id))
    .where(eq(candidates.sessionId, session.id));
  if (when) {
    await notifyMany(
      people.map((p) => p.userId),
      {
        title: "Date de publication des résultats",
        body: `Les résultats du Bacc seront publiés le ${formatDateTime(at)}.`,
        link: "/candidat/resultats",
      },
    );
  } else {
    // Message identique pour tous : la décision se lit dans l'espace, jamais dans une notification.
    await notifyMany(
      people.map((p) => p.userId),
      {
        title: "Résultats du Bacc disponibles",
        body: "Votre résultat est publié. Consultez-le dans votre espace Mianara.",
        link: "/candidat/resultats",
      },
    );
  }
  refresh();
  return ok(
    when
      ? `Publication programmée le ${formatDateTime(at)}.`
      : "Résultats publiés. Les candidats ont été prévenus.",
  );
}
