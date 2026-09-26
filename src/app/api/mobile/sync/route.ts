import { and, eq, inArray } from "drizzle-orm";
import { requireDb } from "@/db";
import { serieSubjects, subjects } from "@/db/schema";
import { mobileRevisionSessions } from "@/db/schema-gestion";
import {
  clientIp,
  getMobilePrincipal,
  hasOversizedBody,
  mobileJson,
  mobileRateLimited,
  readJsonBody,
} from "@/lib/mobile-api";
import { mobileRevisionBatchSchema } from "@/lib/mobile-contract";

const BODY_LIMIT = 64 * 1024;

export async function POST(request: Request) {
  if (hasOversizedBody(request, BODY_LIMIT)) return mobileJson({ error: "Requête trop volumineuse." }, 413);

  try {
    if (mobileRateLimited(`sync-ip:${clientIp(request)}`, 120, 10 * 60_000)) {
      return mobileJson({ error: "Trop de synchronisations. Réessayez plus tard." }, 429);
    }
    const principal = await getMobilePrincipal(request);
    if (!principal) return mobileJson({ error: "Session mobile invalide ou expirée." }, 401);
    if (principal.mustChangePassword) {
      return mobileJson({ error: "Modifiez d'abord votre mot de passe dans l'espace web." }, 403);
    }
    if (mobileRateLimited(`sync:${principal.candidateId}`, 60, 10 * 60_000)) {
      return mobileJson({ error: "Trop de synchronisations. Réessayez plus tard." }, 429);
    }

    const body = await readJsonBody(request, BODY_LIMIT);
    if (body.tooLarge) return mobileJson({ error: "Requête trop volumineuse." }, 413);
    const parsed = mobileRevisionBatchSchema().safeParse(body.value);
    if (!parsed.success) return mobileJson({ error: "Lot de révisions invalide." }, 400);

    const db = requireDb();
    const subjectRows = await db
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        nameMg: subjects.nameMg,
        coefficient: serieSubjects.coefficient,
      })
      .from(serieSubjects)
      .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId))
      .where(eq(serieSubjects.serieCode, principal.serieCode));

    const subjectsByCode = new Map(subjectRows.map((subject) => [subject.code, subject]));
    if (parsed.data.revisions.some(({ subject }) => !subjectsByCode.has(subject))) {
      return mobileJson({ error: "Une ou plusieurs matières ne sont pas autorisées." }, 422);
    }

    const revisions = parsed.data.revisions;
    const clientIds = revisions.map(({ id }) => id);
    if (revisions.length) {
      await db.transaction(async (tx) => {
        await tx
          .insert(mobileRevisionSessions)
          .values(
            revisions.map((revision) => ({
              clientId: revision.id,
              userId: principal.userId,
              candidateId: principal.candidateId,
              subjectId: subjectsByCode.get(revision.subject)!.id,
              startedAt: new Date(revision.startedAt),
              endedAt: new Date(revision.endedAt),
              progress: revision.progress,
            })),
          )
          .onConflictDoNothing({ target: mobileRevisionSessions.clientId });
      });
    }

    // Return acknowledgements only for records owned by this session's candidate.
    const accepted = clientIds.length
      ? await db
          .select({ clientId: mobileRevisionSessions.clientId })
          .from(mobileRevisionSessions)
          .where(
            and(
              eq(mobileRevisionSessions.candidateId, principal.candidateId),
              inArray(mobileRevisionSessions.clientId, clientIds),
            ),
          )
      : [];

    return mobileJson({
      candidate: {
        id: principal.candidateId,
        matricule: principal.matricule,
        firstName: principal.firstName,
        lastName: principal.lastName,
        serieCode: principal.serieCode,
      },
      subjects: subjectRows.map(({ code, name, nameMg, coefficient }) => ({
        code,
        name,
        nameMg,
        coefficient,
      })),
      acceptedIds: accepted.map(({ clientId }) => clientId),
    });
  } catch (error) {
    console.error("Mobile sync:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
