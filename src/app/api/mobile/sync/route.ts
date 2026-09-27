import { z } from "zod";
import { LearnError, learnCandidate, learnHandler, learnJson, readJson } from "@/lib/learn-api";
import { ingestRevisions, serieSubjectList } from "@/lib/services/learning";

const Body = z.object({
  revisions: z
    .array(
      z.object({
        id: z.uuid(),
        subject: z.string().trim().min(1).max(20),
        startedAt: z.string(),
        endedAt: z.string(),
        progress: z.number().int().min(0).max(100).nullish(),
      }),
    )
    .max(500),
});

/** Révisions du téléphone (file idempotente) ; renvoie les matières de la série du candidat. */
export const POST = learnHandler(async (request: Request) => {
  const { user, profile } = await learnCandidate(request);
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new LearnError(400, "INVALID", "Données de synchronisation invalides.");
  const [acceptedIds, subjects] = await Promise.all([
    ingestRevisions(user.id, parsed.data.revisions),
    serieSubjectList(profile.serieCode),
  ]);
  return learnJson({
    acceptedIds,
    subjects: subjects.map((s) => ({ code: s.code, name: s.name, nameMg: s.nameMg })),
    serverTime: new Date().toISOString(),
  });
});
