"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { users } from "@/db/schema-gestion";
import { learningItems, teachers } from "@/db/schema-learning";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { hashPassword, requireUser } from "@/lib/auth";
import { temporaryPassword } from "@/lib/crypto";
import { MERCHANT_KEY, reviewPayment, setSetting } from "@/lib/services/learning";

const admin = () => requireUser(["admin"]);

/* ---------- Numéro marchand Orange Money ---------- */

export async function saveMerchant(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const raw = String(form.get("merchantNumber") ?? "").replace(/\s+/g, "");
  if (raw && !/^(\+261|0)3[2-9]\d{7}$/.test(raw))
    return fail("Numéro malgache attendu (ex. 032 12 345 67).", { merchantNumber: "Format : 03X XX XXX XX" });
  await setSetting(MERCHANT_KEY, raw || null, user.id);
  await audit({
    actorId: user.id,
    action: "apprentissage.numero_marchand",
    table: "platform_settings",
    newData: { value: raw || null },
  });
  refresh();
  return ok(raw ? "Numéro marchand enregistré : les paiements sont ouverts." : "Paiements fermés.");
}

/* ---------- Validation des contenus ---------- */

export async function reviewItem(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = String(form.get("id"));
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim();
  if (!approve && note.length < 3) return fail("Indiquez le motif du refus.", { note: "Motif obligatoire." });
  const db = requireDb();
  const [item] = await db
    .update(learningItems)
    .set({
      status: approve ? "approved" : "rejected",
      reviewNote: approve ? null : note,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    })
    .where(and(eq(learningItems.id, id), eq(learningItems.status, "submitted")))
    .returning();
  if (!item) return fail("Ce contenu a déjà été traité.");
  await audit({
    actorId: user.id,
    action: approve ? "apprentissage.publier" : "apprentissage.refuser",
    table: "learning_items",
    recordId: id,
    newData: { note: note || null },
  });
  await notify(item.authorId, {
    title: approve ? "Contenu publié" : "Contenu refusé",
    body: approve ? `« ${item.title} » est visible par les candidats.` : `« ${item.title} » : ${note}`,
    link: "/enseignant/contenus",
  });
  refresh();
  return ok(approve ? "Contenu publié dans l'application." : "Contenu renvoyé à l'enseignant.");
}

export async function archiveItemAdmin(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = String(form.get("id"));
  const [item] = await requireDb()
    .update(learningItems)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(learningItems.id, id))
    .returning({ id: learningItems.id });
  if (!item) return fail("Contenu introuvable.");
  await audit({ actorId: user.id, action: "apprentissage.archiver", table: "learning_items", recordId: id });
  refresh();
  return ok("Contenu retiré du catalogue.");
}

/* ---------- Paiements ---------- */

export async function decidePayment(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim();
  if (!approve && note.length < 3) return fail("Indiquez le motif du refus.", { note: "Motif obligatoire." });
  const res = await reviewPayment(String(form.get("id")), approve, note || null, user.id);
  if ("error" in res) return fail(res.error!);
  refresh();
  return ok(approve ? "Paiement validé : l'accès est ouvert." : "Paiement refusé : le candidat est prévenu.");
}

/* ---------- Enseignants ---------- */

const TeacherInput = z.object({
  fullName: z.string().trim().min(3, "Nom obligatoire.").max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{4,40}$/, "4 à 40 caractères : lettres, chiffres, point, tiret."),
  subjectId: z.coerce.number().int().positive("Choisissez la matière."),
  email: z.union([z.email("Email invalide."), z.literal("")]).optional(),
  phone: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(300).optional(),
});

export async function createTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = TeacherInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const [subject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(eq(subjects.id, parsed.data.subjectId));
  if (!subject) return fail("Matière inconnue.", { subjectId: "Matière inconnue." });
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${parsed.data.username}`);
  if (taken) return fail("Identifiant déjà utilisé.", { username: "Identifiant déjà utilisé." });
  const password = temporaryPassword();
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({
        role: "teacher",
        username: parsed.data.username,
        fullName: parsed.data.fullName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        passwordHash: hash,
        mustChangePassword: true,
      })
      .returning({ id: users.id });
    await tx.insert(teachers).values({ userId: u.id, subjectId: subject.id, bio: parsed.data.bio || null });
    await audit(
      {
        actorId: user.id,
        action: "enseignant.creer",
        table: "users",
        recordId: u.id,
        newData: { ...parsed.data },
      },
      tx,
    );
  });
  refresh();
  return ok(`Compte enseignant ${parsed.data.username} créé.`, { secret: password });
}

export async function toggleTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = String(form.get("id"));
  const db = requireDb();
  const [t] = await db
    .select({ active: users.isActive })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "teacher")));
  if (!t) return fail("Enseignant introuvable.");
  await db.update(users).set({ isActive: !t.active }).where(eq(users.id, id));
  await audit({
    actorId: user.id,
    action: "enseignant.modifier",
    table: "users",
    recordId: id,
    newData: { isActive: !t.active },
  });
  refresh();
  return ok(t.active ? "Compte fermé." : "Compte réactivé.");
}
