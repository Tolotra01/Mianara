import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { candidatePhotos, candidates, examCenters, rooms, users } from "@/db/schema-gestion";
import { examSessions } from "@/db/schema";
import { audit, type Executor } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { formatMatricule } from "@/lib/bac-rules";
import { encrypt, signQr, temporaryPassword } from "@/lib/crypto";

export type NewCandidate = {
  officeId: number;
  lastName: string;
  firstName: string;
  birthDate: string;
  birthPlace: string;
  gender: "F" | "M";
  serieCode: "L" | "S" | "OSE";
  kind: "ecole" | "libre";
  schoolName?: string | null;
  cin?: string | null;
  phone?: string | null;
  email?: string | null;
  centerId?: number | null;
  roomId?: number | null;
  photo?: { mime: string; data: Buffer } | null;
};

/** Session du Bac en cours (une seule à la fois). */
export async function currentSession(exec: Executor) {
  const [session] = await exec.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  if (!session) throw new Error("Aucune session du Bac en cours : l'Admin doit en ouvrir une.");
  return session;
}

/**
 * Enregistre un candidat validé par l'Office. Génère d'un coup (OFF-02) :
 * matricule, compte candidat, mot de passe temporaire, jeton QR signé.
 * La convocation PDF est produite à la demande à partir de ces données.
 */
export async function registerCandidate(input: NewCandidate, actorId: string | null, exec: Executor) {
  const session = await currentSession(exec);
  const [{ n }] = await exec.execute<{ n: string }>(sql`select nextval('candidate_number_seq') as n`);
  const matricule = formatMatricule(session.year, input.serieCode, Number(n));
  const password = temporaryPassword();

  const [user] = await exec
    .insert(users)
    .values({
      role: "candidate",
      username: matricule,
      passwordHash: await hashPassword(password),
      fullName: `${input.firstName} ${input.lastName}`,
      email: input.email || null,
      phone: input.phone || null,
      officeId: input.officeId,
      mustChangePassword: true,
    })
    .returning({ id: users.id });

  const id = randomUUID();
  const [candidate] = await exec
    .insert(candidates)
    .values({
      id,
      userId: user.id,
      officeId: input.officeId,
      sessionId: session.id,
      matricule,
      lastName: input.lastName.toUpperCase(),
      firstName: input.firstName,
      birthDate: input.birthDate,
      birthPlace: input.birthPlace,
      gender: input.gender,
      cin: input.cin || null,
      phone: input.phone || null,
      email: input.email || null,
      schoolName: input.schoolName || null,
      kind: input.kind,
      serieCode: input.serieCode,
      centerId: input.centerId ?? null,
      roomId: input.roomId ?? null,
      qrToken: signQr(id),
      tempPasswordEnc: encrypt(password),
      createdBy: actorId,
    })
    .returning();

  if (input.photo) await exec.insert(candidatePhotos).values({ candidateId: id, ...input.photo });

  await audit(
    { actorId, action: "candidat.enregistrer", table: "candidates", recordId: id, newData: candidate },
    exec,
  );
  return { candidate, password };
}

/** Nouveau mot de passe temporaire (candidat qui a perdu le sien), imprimé sur une nouvelle convocation. */
export async function resetCandidatePassword(candidateId: string, actorId: string, exec: Executor) {
  const [c] = await exec.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
  if (!c?.userId) throw new Error("Candidat introuvable.");
  const password = temporaryPassword();
  await exec
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, c.userId));
  await exec
    .update(candidates)
    .set({ tempPasswordEnc: encrypt(password), updatedAt: new Date() })
    .where(eq(candidates.id, candidateId));
  await audit(
    { actorId, action: "candidat.reinitialiser_mot_de_passe", table: "candidates", recordId: candidateId },
    exec,
  );
  return password;
}

/**
 * Répartit les candidats sans salle dans les salles de l'Office, par série puis
 * par nom, en respectant la capacité. Renvoie le nombre de candidats placés.
 */
export async function assignRooms(officeId: number, actorId: string, exec: Executor) {
  const roomRows = await exec
    .select({ id: rooms.id, centerId: rooms.centerId, capacity: rooms.capacity })
    .from(rooms)
    .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
    .where(eq(examCenters.officeId, officeId))
    .orderBy(asc(examCenters.id), asc(rooms.id));

  const occupied = await exec
    .select({
      roomId: candidates.roomId,
      count: sql<number>`count(*)::int`,
      maxSeat: sql<number>`coalesce(max(${candidates.seatNumber}), 0)::int`,
    })
    .from(candidates)
    .where(eq(candidates.officeId, officeId))
    .groupBy(candidates.roomId);
  const load = new Map(
    occupied.filter((o) => o.roomId).map((o) => [o.roomId!, { count: o.count, seat: o.maxSeat }]),
  );

  const waiting = await exec
    .select({ id: candidates.id })
    .from(candidates)
    .where(and(eq(candidates.officeId, officeId), isNull(candidates.roomId)))
    .orderBy(asc(candidates.serieCode), asc(candidates.lastName), asc(candidates.firstName));

  let placed = 0;
  let r = 0;
  for (const c of waiting) {
    while (r < roomRows.length && (load.get(roomRows[r].id)?.count ?? 0) >= roomRows[r].capacity) r++;
    if (r >= roomRows.length) break;
    const room = roomRows[r];
    const current = load.get(room.id) ?? { count: 0, seat: 0 };
    const seat = current.seat + 1;
    await exec
      .update(candidates)
      .set({ centerId: room.centerId, roomId: room.id, seatNumber: seat, updatedAt: new Date() })
      .where(eq(candidates.id, c.id));
    load.set(room.id, { count: current.count + 1, seat });
    placed++;
  }
  await audit(
    { actorId, action: "candidats.repartir_salles", table: "candidates", newData: { officeId, placed } },
    exec,
  );
  return { placed, remaining: waiting.length - placed };
}
