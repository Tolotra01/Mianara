"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { examCenters, rooms, supervisorRooms, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { hashPassword, requireOfficeAgent } from "@/lib/auth";
import { temporaryPassword } from "@/lib/crypto";
import { phoneField } from "@/lib/phone";

const Supervisor = z.object({
  fullName: z.string().trim().min(3, "Nom complet obligatoire.").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{4,40}$/, "4 à 40 caractères : lettres, chiffres, point, tiret."),
  phone: phoneField(),
});

/** OFF-11 : compte surveillant. Le mot de passe temporaire n'est affiché qu'une fois. */
export async function createSupervisor(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const parsed = Supervisor.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${parsed.data.username}`);
  if (taken) return fail("Identifiant déjà utilisé.", { username: "Identifiant déjà utilisé." });

  const password = temporaryPassword();
  const [sup] = await db
    .insert(users)
    .values({
      role: "supervisor",
      username: parsed.data.username,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      officeId: user.officeId,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    })
    .returning({ id: users.id, username: users.username });
  await audit({
    actorId: user.id,
    action: "surveillant.creer",
    table: "users",
    recordId: sup.id,
    newData: parsed.data,
  });
  refresh();
  return ok(`Compte ${sup.username} créé.`, { secret: password });
}

/** Salles surveillées : remplace l'affectation actuelle par les salles cochées. */
export async function assignSupervisor(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const supervisorId = String(form.get("supervisorId") ?? "");
  const roomIds = form.getAll("roomIds").map(Number).filter(Boolean);
  const db = requireDb();
  const [sup] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, supervisorId), eq(users.role, "supervisor"), eq(users.officeId, user.officeId)));
  if (!sup) return fail("Surveillant introuvable.");
  if (roomIds.length) {
    const allowed = await db
      .select({ id: rooms.id })
      .from(rooms)
      .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
      .where(and(inArray(rooms.id, roomIds), eq(examCenters.officeId, user.officeId)));
    if (allowed.length !== roomIds.length) return fail("Salle invalide.");
  }
  await requireTxDb().transaction(async (tx) => {
    await tx.delete(supervisorRooms).where(eq(supervisorRooms.supervisorId, supervisorId));
    if (roomIds.length)
      await tx.insert(supervisorRooms).values(roomIds.map((roomId) => ({ supervisorId, roomId })));
    await audit(
      {
        actorId: user.id,
        action: "surveillant.affecter",
        table: "supervisor_rooms",
        recordId: supervisorId,
        newData: { roomIds },
      },
      tx,
    );
  });
  refresh();
  return ok(`Affectation de ${sup.fullName} enregistrée.`);
}

export async function toggleSupervisor(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const id = String(form.get("id") ?? "");
  const db = requireDb();
  const [sup] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "supervisor"), eq(users.officeId, user.officeId)));
  if (!sup) return fail("Surveillant introuvable.");
  await db.update(users).set({ isActive: !sup.isActive }).where(eq(users.id, id));
  await audit({
    actorId: user.id,
    action: "surveillant.affecter",
    table: "users",
    recordId: id,
    newData: { isActive: !sup.isActive },
  });
  refresh();
  return ok(sup.isActive ? "Compte désactivé." : "Compte réactivé.");
}
