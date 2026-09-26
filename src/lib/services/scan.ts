/**
 * Logique de contrôle des convocations pendant les épreuves. Elle sera exposée
 * à l'application mobile de scan (phase suivante) : le web n'enregistre pas de scans,
 * il affiche ceux remontés par l'application.
 */
import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import {
  candidatePhotos,
  candidates,
  examCenters,
  exams,
  rooms,
  scans,
  supervisorRooms,
} from "@/db/schema-gestion";
import type { CurrentUser } from "@/lib/auth";
import {
  availableActions,
  ENTRY_OPENS_MIN,
  END_CLOSES_MIN,
  scanState,
  type ScanState,
  type ScanType,
} from "@/lib/bac-rules";
import { verifyQr } from "@/lib/crypto";

export type ScanCard = {
  candidate: {
    id: string;
    name: string;
    matricule: string;
    serie: string;
    photo: string | null;
    center: string | null;
    room: string | null;
    seat: number | null;
  };
  exam: { id: number; subject: string; startsAt: string; endsAt: string } | null;
  nextExam: { subject: string; startsAt: string } | null;
  state: ScanState;
  actions: ScanType[];
  warning: string | null;
};

/** Retrouve un candidat à partir du QR (signature vérifiée) ou de son matricule. */
export async function findCandidate(code: string, user: CurrentUser) {
  const value = code.trim();
  const db = requireDb();
  const byQr = verifyQr(value);
  if (value.startsWith("MIA1.") && !byQr)
    return { error: "QR code invalide ou falsifié : signature incorrecte." } as const;
  const where = byQr ? eq(candidates.id, byQr) : eq(candidates.matricule, value.toUpperCase());
  const [c] = await db.select().from(candidates).where(where).limit(1);
  if (!c) return { error: "Aucun candidat ne correspond à ce code." } as const;
  if (user.role !== "admin" && c.officeId !== user.officeId)
    return { error: "Ce candidat dépend d'un autre Office du Bac." } as const;
  return { candidate: c } as const;
}

/** Épreuve de la série dont la fenêtre de contrôle (−30 min / +30 min) contient `now`. */
export async function currentExam(sessionId: number, serie: string, now = new Date()) {
  const db = requireDb();
  const opensBefore = new Date(now.getTime() + ENTRY_OPENS_MIN * 60_000);
  const closesAfter = new Date(now.getTime() - END_CLOSES_MIN * 60_000);
  const [exam] = await db
    .select({ id: exams.id, subject: subjects.name, startsAt: exams.startsAt, endsAt: exams.endsAt })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(
      and(
        eq(exams.sessionId, sessionId),
        eq(exams.serieCode, serie),
        eq(exams.isPublished, true),
        lte(exams.startsAt, opensBefore),
        gte(exams.endsAt, closesAfter),
      ),
    )
    .orderBy(asc(exams.startsAt))
    .limit(1);
  return exam ?? null;
}

export async function buildScanCard(
  c: typeof candidates.$inferSelect,
  user: CurrentUser,
  now = new Date(),
): Promise<ScanCard> {
  const db = requireDb();
  const [[place], [photo], exam, mine] = await Promise.all([
    db
      .select({ center: examCenters.name, room: rooms.name })
      .from(rooms)
      .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
      .where(eq(rooms.id, c.roomId ?? -1)),
    db
      .select({ id: candidatePhotos.candidateId })
      .from(candidatePhotos)
      .where(eq(candidatePhotos.candidateId, c.id)),
    currentExam(c.sessionId, c.serieCode, now),
    user.role === "supervisor"
      ? db
          .select({ roomId: supervisorRooms.roomId })
          .from(supervisorRooms)
          .where(eq(supervisorRooms.supervisorId, user.id))
      : Promise.resolve(null),
  ]);

  let state: ScanState = { entered: false, out: false, ended: false, fraud: false };
  let nextExam: ScanCard["nextExam"] = null;
  if (exam) {
    const history = await db
      .select({ type: scans.type })
      .from(scans)
      .where(and(eq(scans.candidateId, c.id), eq(scans.examId, exam.id)))
      .orderBy(asc(scans.scannedAt));
    state = scanState(history.map((h) => h.type));
  } else {
    const [next] = await db
      .select({ subject: subjects.name, startsAt: exams.startsAt })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(
        and(
          eq(exams.sessionId, c.sessionId),
          eq(exams.serieCode, c.serieCode),
          eq(exams.isPublished, true),
          gte(exams.startsAt, now),
        ),
      )
      .orderBy(asc(exams.startsAt))
      .limit(1);
    if (next) nextExam = { subject: next.subject, startsAt: next.startsAt.toISOString() };
  }

  let warning: string | null = null;
  if (!c.roomId) warning = "Ce candidat n'a pas de salle attribuée.";
  else if (mine && !mine.some((m) => m.roomId === c.roomId)) {
    warning = `Ce candidat est affecté à une autre salle : ${place?.center ?? ""} · ${place?.room ?? ""}.`;
  }

  return {
    candidate: {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      matricule: c.matricule,
      serie: c.serieCode,
      photo: photo ? `/api/photos/${c.id}` : null,
      center: place?.center ?? null,
      room: place?.room ?? null,
      seat: c.seatNumber,
    },
    exam: exam
      ? {
          id: exam.id,
          subject: exam.subject,
          startsAt: exam.startsAt.toISOString(),
          endsAt: exam.endsAt.toISOString(),
        }
      : null,
    nextExam,
    state,
    actions: exam ? availableActions(state, exam, now) : [],
    warning,
  };
}
