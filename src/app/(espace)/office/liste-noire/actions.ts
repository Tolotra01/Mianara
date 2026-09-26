"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { blacklist, candidates } from "@/db/schema-gestion";
import { type ActionState, fail, ok } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { requireOfficeAgent } from "@/lib/auth";

const Entry = z.object({
  candidateId: z.uuid(),
  reason: z.string().trim().min(5, "Précisez le motif (5 caractères au moins).").max(500),
  endsAt: z.union([z.literal(""), z.iso.date()]).optional(),
});

/** OFF-08 : inscription en liste noire, qui bloque les demandes de relevé et de diplôme (RG-13). */
export async function addToBlacklist(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const parsed = Entry.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const db = requireDb();
  const [c] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, parsed.data.candidateId), eq(candidates.officeId, user.officeId)));
  if (!c) return fail("Candidat introuvable.");
  const [active] = await db
    .select()
    .from(blacklist)
    .where(and(eq(blacklist.candidateId, c.id), isNull(blacklist.liftedAt)));
  if (active) return fail("Ce candidat est déjà en liste noire.");

  const [entry] = await db
    .insert(blacklist)
    .values({
      candidateId: c.id,
      reason: parsed.data.reason,
      endsAt: parsed.data.endsAt || null,
      addedBy: user.id,
    })
    .returning();
  await audit({
    actorId: user.id,
    action: "liste_noire.ajouter",
    table: "blacklist",
    recordId: entry.id,
    newData: entry,
  });
  await notify(c.userId, {
    title: "Demandes de documents suspendues",
    body: "Votre dossier fait l'objet d'une mesure de l'Office du Bac. Contactez-le pour plus d'informations.",
  });
  refresh();
  return ok(`${c.firstName} ${c.lastName} inscrit en liste noire.`);
}

export async function liftBlacklist(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [entry] = await db
    .select({ b: blacklist, officeId: candidates.officeId })
    .from(blacklist)
    .innerJoin(candidates, eq(candidates.id, blacklist.candidateId))
    .where(eq(blacklist.id, id));
  if (!entry || entry.officeId !== user.officeId) return fail("Inscription introuvable.");
  await db.update(blacklist).set({ liftedAt: new Date() }).where(eq(blacklist.id, id));
  await audit({
    actorId: user.id,
    action: "liste_noire.lever",
    table: "blacklist",
    recordId: id,
    oldData: entry.b,
  });
  refresh();
  return ok("Mesure levée : le candidat peut de nouveau faire ses demandes.");
}
