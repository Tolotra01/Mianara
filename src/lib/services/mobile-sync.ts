import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions, series, subjects } from "@/db/schema";
import {
  candidatePhotos,
  candidates,
  examCenters,
  exams,
  rooms,
  scans,
  supervisorRooms,
} from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { checkScan, scanState, type ScanType } from "@/lib/bac-rules";
import type { CurrentUser } from "@/lib/auth";

type MobileUser = CurrentUser & { officeId: number };

/** Au-delà de cet écart entre l'horloge du téléphone et celle du serveur, le scan est signalé. */
export const MAX_DRIFT_SECONDS = 5 * 60;

/** Salles contrôlées : celles du surveillant, ou toutes celles de l'Office pour un agent. */
async function roomsInScope(user: MobileUser) {
  const db = requireDb();
  const base = db
    .select({
      id: rooms.id,
      name: rooms.name,
      capacity: rooms.capacity,
      centerId: examCenters.id,
      center: examCenters.name,
      city: examCenters.city,
    })
    .from(rooms)
    .innerJoin(examCenters, eq(examCenters.id, rooms.centerId));
  if (user.role === "supervisor") {
    return base
      .innerJoin(supervisorRooms, eq(supervisorRooms.roomId, rooms.id))
      .where(eq(supervisorRooms.supervisorId, user.id))
      .orderBy(asc(examCenters.name), asc(rooms.name));
  }
  return base.where(eq(examCenters.officeId, user.officeId)).orderBy(asc(examCenters.name), asc(rooms.name));
}

/**
 * Paquet hors ligne (SCN-07/08) : tout ce qu'il faut pour contrôler les épreuves
 * sans réseau. Les photos se téléchargent à part (/photos/:id).
 */
export async function buildPackage(user: MobileUser) {
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  const roomList = await roomsInScope(user);
  const roomIds = roomList.map((r) => r.id);

  const people = roomIds.length
    ? await db
        .select({
          id: candidates.id,
          matricule: candidates.matricule,
          lastName: candidates.lastName,
          firstName: candidates.firstName,
          birthDate: candidates.birthDate,
          serieCode: candidates.serieCode,
          roomId: candidates.roomId,
          seatNumber: candidates.seatNumber,
          schoolName: candidates.schoolName,
          kind: candidates.kind,
          status: candidates.status,
          hasPhoto: candidatePhotos.candidateId,
          updatedAt: candidates.updatedAt,
        })
        .from(candidates)
        .leftJoin(candidatePhotos, eq(candidatePhotos.candidateId, candidates.id))
        .where(and(eq(candidates.officeId, user.officeId), inArray(candidates.roomId, roomIds)))
        .orderBy(asc(candidates.roomId), asc(candidates.seatNumber))
    : [];

  const serieCodes = [...new Set(people.map((p) => p.serieCode))];
  const examList =
    session && serieCodes.length
      ? await db
          .select({
            id: exams.id,
            serieCode: exams.serieCode,
            subject: subjects.name,
            startsAt: exams.startsAt,
            endsAt: exams.endsAt,
          })
          .from(exams)
          .innerJoin(subjects, eq(subjects.id, exams.subjectId))
          .where(
            and(
              eq(exams.sessionId, session.id),
              eq(exams.isPublished, true),
              inArray(exams.serieCode, serieCodes),
            ),
          )
          .orderBy(asc(exams.startsAt))
      : [];

  const ids = people.map((p) => p.id);
  const history = ids.length
    ? await db
        .select({
          id: scans.id,
          candidateId: scans.candidateId,
          examId: scans.examId,
          type: scans.type,
          scannedAt: scans.scannedAt,
          comment: scans.comment,
        })
        .from(scans)
        .where(and(inArray(scans.candidateId, ids)))
        .orderBy(asc(scans.scannedAt))
    : [];

  const serieNames = serieCodes.length
    ? await db
        .select({ code: series.code, name: series.name })
        .from(series)
        .where(inArray(series.code, serieCodes))
    : [];

  return {
    generatedAt: new Date().toISOString(),
    session: session ? { id: session.id, year: session.year } : null,
    rooms: roomList,
    series: serieNames,
    exams: examList.map((e) => ({
      ...e,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
    })),
    candidates: people.map(({ hasPhoto, updatedAt, ...p }) => ({
      ...p,
      hasPhoto: Boolean(hasPhoto),
      version: updatedAt.toISOString(),
    })),
    scans: history
      .filter((s) => s.examId != null)
      .map((s) => ({ ...s, scannedAt: s.scannedAt.toISOString(), status: "synced" })),
  };
}

export type IncomingScan = {
  id: string;
  candidateId: string;
  examId: number;
  type: ScanType;
  scannedAt: string;
  comment?: string | null;
};

export type ScanOutcome = { id: string; status: "accepted" | "duplicate" | "rejected"; reason?: string };

/**
 * Réception des scans du téléphone (synchronisation idempotente). Chaque scan est
 * revérifié à l'heure où il a été fait, dans l'ordre chronologique.
 */
export async function ingestScans(
  user: MobileUser,
  incoming: IncomingScan[],
  deviceNow: Date,
  deviceId: string | null,
) {
  const db = requireDb();
  const drift = Math.round((Date.now() - deviceNow.getTime()) / 1000);
  const suspicious = Math.abs(drift) > MAX_DRIFT_SECONDS;
  const outcomes: ScanOutcome[] = [];

  const sorted = [...incoming].sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
  const candidateIds = [...new Set(sorted.map((s) => s.candidateId))];
  const examIds = [...new Set(sorted.map((s) => s.examId))];
  const [people, examRows, existing] = await Promise.all([
    candidateIds.length
      ? db.select().from(candidates).where(inArray(candidates.id, candidateIds))
      : Promise.resolve([]),
    examIds.length ? db.select().from(exams).where(inArray(exams.id, examIds)) : Promise.resolve([]),
    candidateIds.length
      ? db
          .select({
            id: scans.id,
            candidateId: scans.candidateId,
            examId: scans.examId,
            type: scans.type,
            scannedAt: scans.scannedAt,
          })
          .from(scans)
          .where(inArray(scans.candidateId, candidateIds))
      : Promise.resolve([]),
  ]);
  const known = new Set(existing.map((s) => s.id));
  const history = existing.map((s) => ({ ...s }));

  for (const s of sorted) {
    if (known.has(s.id)) {
      outcomes.push({ id: s.id, status: "duplicate" });
      continue;
    }
    const c = people.find((p) => p.id === s.candidateId);
    const exam = examRows.find((e) => e.id === s.examId);
    // Horloge du téléphone décalée : l'heure du scan est recalée sur celle du serveur.
    const at = new Date(new Date(s.scannedAt).getTime() + (suspicious ? drift * 1000 : 0));
    if (!c || c.officeId !== user.officeId) {
      outcomes.push({ id: s.id, status: "rejected", reason: "Candidat inconnu de votre Office." });
      continue;
    }
    if (!exam || exam.serieCode !== c.serieCode) {
      outcomes.push({
        id: s.id,
        status: "rejected",
        reason: "Épreuve sans rapport avec la série du candidat.",
      });
      continue;
    }
    if (Number.isNaN(at.getTime())) {
      outcomes.push({ id: s.id, status: "rejected", reason: "Heure de scan invalide." });
      continue;
    }
    if (s.type === "fraud" && (!s.comment || s.comment.trim().length < 3)) {
      outcomes.push({ id: s.id, status: "rejected", reason: "Une fraude doit être décrite." });
      continue;
    }
    const before = history
      .filter((h) => h.candidateId === c.id && h.examId === exam.id && h.scannedAt <= at)
      .sort((a, b) => a.scannedAt.getTime() - b.scannedAt.getTime());
    const refusal = checkScan(s.type, scanState(before.map((h) => h.type)), exam, at);
    if (refusal) {
      outcomes.push({ id: s.id, status: "rejected", reason: refusal });
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.insert(scans).values({
        id: s.id,
        candidateId: c.id,
        examId: exam.id,
        roomId: c.roomId,
        scannedBy: user.id,
        type: s.type,
        comment: s.comment?.trim() || null,
        scannedAt: at,
        deviceId,
        clockDriftSeconds: drift,
      });
      await audit(
        {
          actorId: user.id,
          action: `scan.${s.type}`,
          table: "scans",
          recordId: s.id,
          newData: { candidateId: c.id, examId: exam.id, via: "mobile", drift },
        },
        tx,
      );
    });
    known.add(s.id);
    history.push({ id: s.id, candidateId: c.id, examId: exam.id, type: s.type, scannedAt: at });
    outcomes.push({ id: s.id, status: "accepted" });
  }
  return { outcomes, drift, suspicious };
}
