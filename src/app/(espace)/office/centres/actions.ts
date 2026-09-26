"use server";

import { and, count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { candidates, examCenters, rooms } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireOfficeAgent } from "@/lib/auth";

const Center = z.object({
  name: z.string().trim().min(2, "Nom du centre obligatoire.").max(120),
  city: z.string().trim().min(2, "Ville obligatoire.").max(60),
  address: z.string().trim().max(160).optional(),
});

export async function createCenter(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const parsed = Center.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const [center] = await requireDb()
    .insert(examCenters)
    .values({ ...parsed.data, address: parsed.data.address || null, officeId: user.officeId })
    .returning();
  await audit({
    actorId: user.id,
    action: "centre.creer",
    table: "exam_centers",
    recordId: center.id,
    newData: center,
  });
  refresh();
  return ok(`Centre « ${center.name} » créé.`);
}

const Room = z.object({
  centerId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Nom de la salle obligatoire.").max(40),
  capacity: z.coerce.number().int().min(1, "Capacité d'au moins 1 place.").max(500, "500 places au maximum."),
});

export async function createRoom(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const parsed = Room.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const [center] = await db
    .select()
    .from(examCenters)
    .where(and(eq(examCenters.id, parsed.data.centerId), eq(examCenters.officeId, user.officeId)));
  if (!center) return fail("Centre introuvable.");
  const [exists] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.centerId, center.id), eq(rooms.name, parsed.data.name)));
  if (exists) return fail("Une salle porte déjà ce nom dans ce centre.", { name: "Nom déjà utilisé." });
  const [room] = await db.insert(rooms).values(parsed.data).returning();
  await audit({ actorId: user.id, action: "salle.creer", table: "rooms", recordId: room.id, newData: room });
  refresh();
  return ok(`${room.name} ajoutée (${room.capacity} places).`);
}

export async function deleteRoom(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [room] = await db
    .select({ r: rooms })
    .from(rooms)
    .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
    .where(and(eq(rooms.id, id), eq(examCenters.officeId, user.officeId)));
  if (!room) return fail("Salle introuvable.");
  const [{ n }] = await db.select({ n: count() }).from(candidates).where(eq(candidates.roomId, id));
  if (n > 0) return fail(`Impossible : ${n} candidat(s) sont placés dans cette salle.`);
  await db.delete(rooms).where(eq(rooms.id, id));
  await audit({ actorId: user.id, action: "salle.supprimer", table: "rooms", recordId: id, oldData: room.r });
  refresh();
  return ok("Salle supprimée.");
}
