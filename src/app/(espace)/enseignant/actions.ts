"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { learningItems } from "@/db/schema-learning";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { closeSession, postMessage, sessionFor, teacherProfile } from "@/lib/services/learning";

async function teacher() {
  const user = await requireUser(["teacher"]);
  const profile = await teacherProfile(user.id);
  if (!profile) throw new Error("Compte enseignant sans matière.");
  return { ...user, subjectId: profile.subjectId };
}

const ItemInput = z
  .object({
    kind: z.enum(["course", "training", "coaching"]),
    title: z.string().trim().min(4, "Titre trop court.").max(120),
    description: z.string().trim().min(10, "Décrivez le contenu en une ou deux phrases.").max(400),
    content: z.string().trim().max(60000).optional(),
    priceAmount: z.coerce.number().int().min(0, "Prix invalide.").max(500000, "Prix trop élevé.").optional(),
    durationMinutes: z.coerce.number().int().min(0).max(600).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "coaching" && (v.content ?? "").length < 30)
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "Rédigez le contenu (30 caractères au moins).",
      });
    if (v.kind === "coaching" && !v.priceAmount)
      ctx.addIssue({
        code: "custom",
        path: ["priceAmount"],
        message: "Fixez le prix de la séance de tutorat.",
      });
  });

/** Création ou modification d'un contenu (brouillon ou refusé), avec envoi optionnel à la validation. */
export async function saveItem(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await teacher();
  const raw = Object.fromEntries(form);
  const parsed = ItemInput.safeParse({
    ...raw,
    priceAmount: raw.priceAmount === "" ? undefined : raw.priceAmount,
    durationMinutes: raw.durationMinutes === "" ? undefined : raw.durationMinutes,
  });
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const submit = form.get("submit") === "1";
  const data = {
    kind: parsed.data.kind,
    title: parsed.data.title,
    description: parsed.data.description,
    content: parsed.data.content ?? "",
    priceAmount: parsed.data.priceAmount || null,
    durationMinutes: parsed.data.durationMinutes || null,
    status: submit ? ("submitted" as const) : ("draft" as const),
    reviewNote: null,
    updatedAt: new Date(),
  };
  const db = requireDb();
  const id = String(form.get("id") ?? "");
  if (id) {
    const [row] = await db
      .update(learningItems)
      .set(data)
      .where(
        and(
          eq(learningItems.id, id),
          eq(learningItems.authorId, user.id),
          inArray(learningItems.status, ["draft", "rejected"]),
        ),
      )
      .returning({ id: learningItems.id });
    if (!row) return fail("Ce contenu n'est plus modifiable (en validation ou publié).");
  } else {
    const [row] = await db
      .insert(learningItems)
      .values({ ...data, subjectId: user.subjectId, authorId: user.id })
      .returning({ id: learningItems.id });
    await audit({
      actorId: user.id,
      action: "apprentissage.creer",
      table: "learning_items",
      recordId: row.id,
    });
  }
  refresh();
  return ok(submit ? "Contenu envoyé à l'Administration pour validation." : "Brouillon enregistré.");
}

export async function submitItem(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await teacher();
  const [row] = await requireDb()
    .update(learningItems)
    .set({ status: "submitted", updatedAt: new Date() })
    .where(
      and(
        eq(learningItems.id, String(form.get("id"))),
        eq(learningItems.authorId, user.id),
        inArray(learningItems.status, ["draft", "rejected"]),
      ),
    )
    .returning({ id: learningItems.id });
  if (!row) return fail("Ce contenu ne peut pas être envoyé.");
  refresh();
  return ok("Envoyé à la validation.");
}

export async function archiveItem(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await teacher();
  const [row] = await requireDb()
    .update(learningItems)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(learningItems.id, String(form.get("id"))), eq(learningItems.authorId, user.id)))
    .returning({ id: learningItems.id });
  if (!row) return fail("Contenu introuvable.");
  await audit({
    actorId: user.id,
    action: "apprentissage.archiver",
    table: "learning_items",
    recordId: row.id,
  });
  refresh();
  return ok("Contenu retiré du catalogue.");
}

/* ---------- Tutorat ---------- */

export async function sendTeacherMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(["teacher"]);
  const session = await sessionFor(String(form.get("sessionId")), user);
  if (!session) return fail("Séance introuvable.");
  const res = await postMessage(session, user.id, String(form.get("text") ?? ""));
  if ("error" in res) return fail(res.error!);
  refresh();
  return ok("Message envoyé.");
}

export async function closeTeacherSession(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(["teacher"]);
  const res = await closeSession(String(form.get("sessionId")), user.id);
  if ("error" in res) return fail(res.error!);
  refresh();
  return ok("Séance clôturée.");
}
