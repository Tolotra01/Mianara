"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDb } from "@/db";
import { candidatePhotos, candidates, examCenters, rooms, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireOffice } from "@/lib/auth";
import {
  assignRooms,
  currentSession,
  registerCandidate,
  resetCandidatePassword,
} from "@/lib/services/candidates";

const text = (label: string, max = 80) => z.string().trim().min(1, `${label} obligatoire.`).max(max);
const optional = (max = 80) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const CandidateInput = z
  .object({
    lastName: text("Nom"),
    firstName: text("Prénoms"),
    gender: z.enum(["F", "M"], { error: "Choisissez le sexe." }),
    birthDate: z.iso.date("Date de naissance invalide."),
    birthPlace: text("Lieu de naissance"),
    serieCode: z.enum(["L", "S", "OSE"], { error: "Choisissez la série." }),
    kind: z.enum(["ecole", "libre"]),
    schoolName: optional(120),
    cin: optional(20),
    phone: optional(20),
    email: z
      .union([z.literal(""), z.email("Email invalide.")])
      .optional()
      .transform((v) => v || null),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "ecole" && !v.schoolName)
      ctx.addIssue({
        code: "custom",
        path: ["schoolName"],
        message: "Établissement obligatoire pour un candidat d'école.",
      });
    const age = (Date.now() - new Date(v.birthDate).getTime()) / (365.25 * 86400000);
    if (age < 12 || age > 80)
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Date de naissance improbable." });
  });

const MAX_PHOTO = 2 * 1024 * 1024;

async function readPhoto(form: FormData) {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { photo: null };
  if (!["image/jpeg", "image/png"].includes(file.type)) return { error: "Photo : JPG ou PNG uniquement." };
  if (file.size > MAX_PHOTO) return { error: "Photo trop lourde (2 Mo maximum)." };
  return { photo: { mime: file.type, data: Buffer.from(await file.arrayBuffer()) } };
}

/** OFF-01/02 : enregistrement d'un candidat dont le dossier est complet et validé. */
export async function createCandidate(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOffice();
  const parsed = CandidateInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez les champs signalés.", zodErrors(parsed.error.issues));
  const { photo, error } = await readPhoto(form);
  if (error) return fail(error, { photo: error });

  const db = requireDb();
  const session = await currentSession(db);
  const [twin] = await db
    .select({ matricule: candidates.matricule })
    .from(candidates)
    .where(
      and(
        eq(candidates.sessionId, session.id),
        sql`lower(${candidates.lastName}) = lower(${parsed.data.lastName})`,
        sql`lower(${candidates.firstName}) = lower(${parsed.data.firstName})`,
        eq(candidates.birthDate, parsed.data.birthDate),
      ),
    )
    .limit(1);
  if (twin) return fail(`Ce candidat est déjà enregistré pour cette session (${twin.matricule}).`);

  const { candidate } = await db.transaction((tx) =>
    registerCandidate({ ...parsed.data, officeId: user.officeId, photo }, user.id, tx),
  );
  redirect(`/office/candidats/${candidate.id}?nouveau=1`);
}

/** Correction d'un dossier par l'Office (journalisée). La série et le matricule ne changent pas. */
export async function updateCandidate(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOffice();
  const id = String(form.get("id") ?? "");
  const db = requireDb();
  const [before] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.officeId, user.officeId)))
    .limit(1);
  if (!before) return fail("Candidat introuvable.");

  const parsed = CandidateInput.safeParse({ ...Object.fromEntries(form), serieCode: before.serieCode });
  if (!parsed.success) return fail("Vérifiez les champs signalés.", zodErrors(parsed.error.issues));
  const { photo, error } = await readPhoto(form);
  if (error) return fail(error, { photo: error });

  const { serieCode: _serie, ...data } = parsed.data;
  void _serie;
  const changes = { ...data, lastName: data.lastName.toUpperCase(), updatedAt: new Date() };
  await db.transaction(async (tx) => {
    await tx.update(candidates).set(changes).where(eq(candidates.id, id));
    if (before.userId) {
      await tx
        .update(users)
        .set({ fullName: `${data.firstName} ${changes.lastName}`, email: data.email, phone: data.phone })
        .where(eq(users.id, before.userId));
    }
    if (photo) {
      await tx
        .insert(candidatePhotos)
        .values({ candidateId: id, ...photo })
        .onConflictDoUpdate({ target: candidatePhotos.candidateId, set: photo });
    }
    await audit(
      {
        actorId: user.id,
        action: "candidat.modifier",
        table: "candidates",
        recordId: id,
        oldData: before,
        newData: changes,
      },
      tx,
    );
  });
  refresh();
  return ok("Dossier mis à jour. La convocation reflète déjà les changements.");
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOffice();
  const id = String(form.get("id") ?? "");
  const db = requireDb();
  const [c] = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.officeId, user.officeId)));
  if (!c) return fail("Candidat introuvable.");
  await db.transaction((tx) => resetCandidatePassword(id, user.id, tx));
  refresh();
  return ok("Nouveau mot de passe temporaire généré : imprimez la nouvelle convocation.");
}

/** Placement d'un candidat dans une salle précise (ou retrait). */
export async function placeCandidate(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOffice();
  const id = String(form.get("id") ?? "");
  const roomId = Number(form.get("roomId")) || null;
  const db = requireDb();
  const [c] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.officeId, user.officeId)));
  if (!c) return fail("Candidat introuvable.");

  let centerId: number | null = null;
  let seat: number | null = null;
  if (roomId) {
    const [room] = await db
      .select({ id: rooms.id, centerId: rooms.centerId, capacity: rooms.capacity })
      .from(rooms)
      .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
      .where(and(eq(rooms.id, roomId), eq(examCenters.officeId, user.officeId)));
    if (!room) return fail("Salle introuvable.");
    const [{ n, maxSeat }] = await db
      .select({
        n: sql<number>`count(*)::int`,
        maxSeat: sql<number>`coalesce(max(${candidates.seatNumber}), 0)::int`,
      })
      .from(candidates)
      .where(eq(candidates.roomId, roomId));
    if (c.roomId !== roomId && n >= room.capacity) return fail("Cette salle est complète.");
    centerId = room.centerId;
    seat = c.roomId === roomId ? c.seatNumber : maxSeat + 1;
  }
  await db
    .update(candidates)
    .set({ roomId, centerId, seatNumber: seat, updatedAt: new Date() })
    .where(eq(candidates.id, id));
  await audit({
    actorId: user.id,
    action: "candidat.modifier",
    table: "candidates",
    recordId: id,
    oldData: { roomId: c.roomId },
    newData: { roomId, seat },
  });
  refresh();
  return ok(roomId ? `Candidat placé (place n° ${seat}).` : "Candidat retiré de sa salle.");
}

export async function autoAssign(): Promise<ActionState> {
  const user = await requireOffice();
  const { placed, remaining } = await requireDb().transaction((tx) =>
    assignRooms(user.officeId, user.id, tx),
  );
  refresh();
  if (placed === 0 && remaining === 0) return ok("Tous les candidats ont déjà une salle.");
  return remaining
    ? fail(`${placed} candidat(s) placé(s). ${remaining} sans place : ajoutez des salles.`)
    : ok(`${placed} candidat(s) placé(s) dans les salles.`);
}

/** Réactivation manuelle d'un compte candidat (RG-15). */
export async function reactivateAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOffice();
  const id = String(form.get("id") ?? "");
  const db = requireDb();
  const [c] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.officeId, user.officeId)));
  if (!c?.userId) return fail("Candidat introuvable.");
  await db
    .update(users)
    .set({ isActive: true, lockedUntil: null, failedAttempts: 0 })
    .where(eq(users.id, c.userId));
  await db
    .update(candidates)
    .set({ reactivatedAt: new Date(), ...(c.status === "disabled" ? { status: "active" as const } : {}) })
    .where(eq(candidates.id, id));
  await audit({ actorId: user.id, action: "candidat.reactiver", table: "candidates", recordId: id });
  refresh();
  return ok("Compte réactivé.");
}
