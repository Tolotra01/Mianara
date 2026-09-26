import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { serieSubjects } from "@/db/schema";
import { candidates, grades, results, scans } from "@/db/schema-gestion";
import { audit, type Executor } from "@/lib/audit";
import { computeResult, type Decision } from "@/lib/bac-rules";

/**
 * Délibération des candidats d'un Office (OFF-06) : moyenne pondérée,
 * note éliminatoire, seuil du jury, mention. La fraude constatée pendant une
 * épreuve donne la décision « Fraude » (RG-08).
 */
export async function deliberate(
  officeId: number,
  sessionId: number,
  threshold: number,
  actorId: string,
  exec: Executor,
) {
  const people = await exec
    .select({ id: candidates.id, serie: candidates.serieCode, status: candidates.status })
    .from(candidates)
    .where(
      and(
        eq(candidates.officeId, officeId),
        eq(candidates.sessionId, sessionId),
        ne(candidates.status, "disabled"),
      ),
    );
  if (people.length === 0) return { total: 0, byDecision: {} as Record<Decision, number> };
  const ids = people.map((p) => p.id);

  const [coefs, gradeRows, scanRows] = await Promise.all([
    exec.select().from(serieSubjects),
    exec.select().from(grades).where(inArray(grades.candidateId, ids)),
    exec
      .select({ candidateId: scans.candidateId, type: scans.type })
      .from(scans)
      .where(inArray(scans.candidateId, ids)),
  ]);

  const byDecision: Record<Decision, number> = { admitted: 0, failed: 0, fraud: 0, absent: 0 };
  const now = new Date();
  const rows = people.map((p) => {
    const mine = gradeRows.filter((g) => g.candidateId === p.id);
    const own = scanRows.filter((s) => s.candidateId === p.id);
    const r = computeResult({
      subjects: coefs
        .filter((c) => c.serieCode === p.serie)
        .map((c) => ({ subjectId: c.subjectId, coefficient: c.coefficient })),
      scores: new Map(mine.map((g) => [g.subjectId, g.score])),
      hasFraud: own.some((s) => s.type === "fraud"),
      wasPresent: mine.length > 0 || own.some((s) => s.type === "entry"),
      threshold,
    });
    byDecision[r.decision]++;
    return {
      candidateId: p.id,
      average: r.average,
      mention: r.mention,
      decision: r.decision,
      deliberatedBy: actorId,
      deliberatedAt: now,
    };
  });

  // Écritures groupées : une requête par lot de 1 000 résultats, une par décision pour les statuts.
  for (let i = 0; i < rows.length; i += 1000) {
    await exec
      .insert(results)
      .values(rows.slice(i, i + 1000))
      .onConflictDoUpdate({
        target: results.candidateId,
        set: {
          average: sql`excluded.average`,
          mention: sql`excluded.mention`,
          decision: sql`excluded.decision`,
          deliberatedBy: sql`excluded.deliberated_by`,
          deliberatedAt: sql`excluded.deliberated_at`,
        },
      });
  }
  for (const decision of Object.keys(byDecision) as Decision[]) {
    const ids = rows.filter((r) => r.decision === decision).map((r) => r.candidateId);
    if (ids.length)
      await exec
        .update(candidates)
        .set({ status: decision, updatedAt: now })
        .where(inArray(candidates.id, ids));
  }
  await audit(
    {
      actorId,
      action: "resultats.deliberer",
      table: "results",
      newData: { officeId, threshold, ...byDecision },
    },
    exec,
  );
  return { total: people.length, byDecision };
}
