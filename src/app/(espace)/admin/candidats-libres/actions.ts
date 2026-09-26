"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDb } from "@/db";
import { authSessions, candidatePhotos, candidates, offices, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { IdentityInput, serieExists } from "@/lib/candidate-input";
import { currentSession, registerCandidate, resetCandidatePassword } from "@/lib/services/candidates";

/**
 * Gestion des candidats libres par l'Administration : ils n'ont pas d'école,
 * l'Admin peut donc les enregistrer et corriger leur dossier pour n'importe
 * quel Office (l'Office garde la même main sur les siens).
 */

const admin = () => requireUser(["admin"]);

const FreeCandidateInput = IdentityInput.and(
  z.object({ officeId: z.coerce.number({ error: "Choisissez l'Office." }).int().positive("Choisissez l'Office.") }),
);

const MAX_PHOTO = 2 * 1024 * 1024;

async function readPhoto(form: FormData) {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { photo: null };
  if (!["image/jpeg", "image/png"].includes(file.type)) return { error: "Photo : JPG ou PNG uniquement." };
  if (file.size > MAX_PHOTO) return { error: "Photo trop lourde (2 Mo maximum)." };
  return { photo: { mime: file.type, data: Buffer.from(await file.arrayBuffer()) } };
}

async function activeOffice(id: number) {
  const [office] = await requireDb()
    .select({ id: offices.id, isActive: offices.isActive })
    .from(offices)
    .where(eq(offices.id, id))
    .limit(1);
  return office?.isActive ? office : null;
}

/** Candidat libre existant (les candidats d'école restent gérés par leur Office). */
async function freeCandidate(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [c] = await requireDb()
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, id), eq(candidates.kind, "libre")))
    .limit(1);
  return c ?? null;
}

export async function createFreeCandidate(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = FreeCandidateInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez les champs signalés.", zodErrors(parsed.error.issues));
  const { photo, error } = await readPhoto(form);
  if (error) return fail(error, { photo: error });
  if (!(await activeOffice(parsed.data.officeId)))
    return fail("Office introuvable ou désactivé.", { officeId: "Office introuvable ou désactivé." });

  const db = requireDb();
  if (!(await serieExists(parsed.data.serieCode, db)))
    return fail("Série inconnue.", { serieCode: "Série inconnue." });
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
    registerCandidate({ ...parsed.data, kind: "libre", schoolId: null, schoolName: null, photo }, user.id, tx),
  );
  redirect(`/admin/candidats-libres/${candidate.id}?nouveau=1`);
}

/** Correction du dossier. La série et le matricule ne changent pas ; l'Office peut changer. */
export async function updateFreeCandidate(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = String(form.get("id") ?? "");
  const before = await freeCandidate(id);
  if (!before) return fail("Candidat libre introuvable.");

  const parsed = FreeCandidateInput.safeParse({ ...Object.fromEntries(form), serieCode: before.serieCode });
  if (!parsed.success) return fail("Vérifiez les champs signalés.", zodErrors(parsed.error.issues));
  const { photo, error } = await readPhoto(form);
  if (error) return fail(error, { photo: error });
  const moved = parsed.data.officeId !== before.officeId;
  if (moved && !(await activeOffice(parsed.data.officeId)))
    return fail("Office introuvable ou désactivé.", { officeId: "Office introuvable ou désactivé." });

  const { serieCode: _serie, ...data } = parsed.data;
  void _serie;
  const changes = {
    ...data,
    lastName: data.lastName.toUpperCase(),
    // Nouvel Office : la salle et la place de l'ancien secteur ne valent plus.
    ...(moved ? { roomId: null, centerId: null, seatNumber: null } : {}),
    updatedAt: new Date(),
  };
  await requireDb().transaction(async (tx) => {
    await tx.update(candidates).set(changes).where(eq(candidates.id, id));
    if (before.userId) {
      await tx
        .update(users)
        .set({
          fullName: `${data.firstName} ${changes.lastName}`,
          email: data.email,
          phone: data.phone,
          officeId: data.officeId,
        })
        .where(eq(users.id, before.userId));
    }
    if (photo) {
      await tx
        .insert(candidatePhotos)
        .values({ candidateId: id, ...photo })
        .onConflictDoUpdate({ target: candidatePhotos.candidateId, set: photo });
    }
    await audit(
      { actorId: user.id, action: "candidat.modifier", table: "candidates", recordId: id, oldData: before, newData: changes },
      tx,
    );
  });
  refresh();
  return ok(moved ? "Dossier mis à jour ; le candidat est à placer dans une salle de son nouvel Office." : "Dossier mis à jour.");
}

/** Nouveau mot de passe temporaire, affiché une fois et imprimé sur la convocation. */
export async function resetFreeCandidatePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const c = await freeCandidate(String(form.get("id") ?? ""));
  if (!c?.userId) return fail("Candidat libre introuvable.");
  const password = await requireDb().transaction(async (tx) => {
    const secret = await resetCandidatePassword(c.id, user.id, tx);
    // Les sessions ouvertes avec l'ancien mot de passe sont fermées.
    await tx.delete(authSessions).where(eq(authSessions.userId, c.userId!));
    return secret;
  });
  refresh();
  return ok("Nouveau mot de passe généré : il figure aussi sur la nouvelle convocation.", { secret: password });
}

/** Désactive le compte (plus de connexion) ou le réactive (RG-15). */
export async function toggleFreeCandidateAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const c = await freeCandidate(String(form.get("id") ?? ""));
  if (!c?.userId) return fail("Candidat libre introuvable.");
  const [account] = await requireDb().select({ isActive: users.isActive }).from(users).where(eq(users.id, c.userId));
  const disable = Boolean(account?.isActive) && c.status !== "disabled";

  await requireDb().transaction(async (tx) => {
    if (disable) {
      await tx.update(users).set({ isActive: false }).where(eq(users.id, c.userId!));
      await tx.update(candidates).set({ status: "disabled", updatedAt: new Date() }).where(eq(candidates.id, c.id));
      await tx.delete(authSessions).where(eq(authSessions.userId, c.userId!));
    } else {
      await tx
        .update(users)
        .set({ isActive: true, lockedUntil: null, failedAttempts: 0 })
        .where(eq(users.id, c.userId!));
      await tx
        .update(candidates)
        .set({
          reactivatedAt: new Date(),
          updatedAt: new Date(),
          ...(c.status === "disabled" ? { status: "active" as const } : {}),
        })
        .where(eq(candidates.id, c.id));
    }
    await audit(
      {
        actorId: user.id,
        action: disable ? "candidat.desactiver" : "candidat.reactiver",
        table: "candidates",
        recordId: c.id,
      },
      tx,
    );
  });
  refresh();
  return ok(disable ? "Compte désactivé : le candidat ne peut plus se connecter." : "Compte réactivé.");
}
