"use server";

import { eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { examSessions, news } from "@/db/schema";
import { offices, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { hashPassword, requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/bac-rules";
import { temporaryPassword } from "@/lib/crypto";

const admin = () => requireUser(["admin"]);

/* ---------- Offices (ADM-01) ---------- */

const OfficeInput = z.object({
  name: z.string().trim().min(3, "Nom obligatoire.").max(100),
  university: z.string().trim().min(3, "Université obligatoire.").max(100),
  city: z.string().trim().min(2, "Ville obligatoire.").max(60),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(20).optional(),
});

export async function saveOffice(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = OfficeInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const data = { ...parsed.data, address: parsed.data.address || null, phone: parsed.data.phone || null };
  const id = Number(form.get("id")) || null;
  const db = requireDb();
  if (id) {
    await db.update(offices).set(data).where(eq(offices.id, id));
    await audit({
      actorId: user.id,
      action: "office.modifier",
      table: "offices",
      recordId: id,
      newData: data,
    });
  } else {
    const [o] = await db.insert(offices).values(data).returning();
    await audit({ actorId: user.id, action: "office.creer", table: "offices", recordId: o.id, newData: o });
  }
  refresh();
  return ok(id ? "Office mis à jour." : "Office créé.");
}

export async function toggleOffice(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [o] = await db.select().from(offices).where(eq(offices.id, id));
  if (!o) return fail("Office introuvable.");
  await db.transaction(async (tx) => {
    await tx.update(offices).set({ isActive: !o.isActive }).where(eq(offices.id, id));
    // Désactiver un Office ferme aussi les comptes de ses agents.
    if (o.isActive)
      await tx
        .update(users)
        .set({ isActive: false })
        .where(sql`${users.officeId} = ${id} and ${users.role} = 'office'`);
    await audit(
      {
        actorId: user.id,
        action: "office.modifier",
        table: "offices",
        recordId: id,
        newData: { isActive: !o.isActive },
      },
      tx,
    );
  });
  refresh();
  return ok(o.isActive ? "Office désactivé (comptes agents fermés)." : "Office réactivé.");
}

const AgentInput = z.object({
  officeId: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(3, "Nom complet obligatoire.").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{4,40}$/, "4 à 40 caractères : lettres, chiffres, point, tiret."),
  email: z.union([z.literal(""), z.email("Email invalide.")]).optional(),
});

export async function createAgent(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = AgentInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${parsed.data.username}`);
  if (taken) return fail("Identifiant déjà utilisé.", { username: "Identifiant déjà utilisé." });
  const password = temporaryPassword();
  const [agent] = await db
    .insert(users)
    .values({
      role: "office",
      username: parsed.data.username,
      fullName: parsed.data.fullName,
      email: parsed.data.email || null,
      officeId: parsed.data.officeId,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    })
    .returning({ id: users.id });
  await audit({
    actorId: user.id,
    action: "agent.creer",
    table: "users",
    recordId: agent.id,
    newData: parsed.data,
  });
  refresh();
  return ok(`Compte ${parsed.data.username} créé.`, { secret: password });
}

/* ---------- Session (ADM-05) ---------- */

const optionalDate = z.union([z.literal(""), z.iso.date()]).optional();

const SessionInput = z
  .object({
    examsStart: optionalDate,
    examsEnd: optionalDate,
    admissionThreshold: z.coerce
      .number()
      .min(9.5, "Jamais sous 9,50 (décret 2021-242).")
      .max(10, "10 au plus."),
    transcriptDelayDays: z.coerce.number().int().min(0).max(60),
    transcriptFee: z.coerce.number().int().min(0).max(1_000_000),
    diplomaFee: z.coerce.number().int().min(0).max(1_000_000),
    accountDisableDays: z.coerce.number().int().min(7).max(365),
    resultsPublishAt: z.string().optional(),
  })
  .refine((v) => !v.examsStart || !v.examsEnd || v.examsEnd >= v.examsStart, {
    path: ["examsEnd"],
    message: "La fin suit le début.",
  });

export async function saveSession(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = SessionInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const id = Number(form.get("id"));
  const [before] = await db.select().from(examSessions).where(eq(examSessions.id, id));
  if (!before) return fail("Session introuvable.");
  const { resultsPublishAt: rawPublish, examsStart, examsEnd, ...rest } = parsed.data;
  const publishAt = rawPublish ? parseLocalDateTime(rawPublish) : null;
  if (rawPublish && !publishAt)
    return fail("Date de publication invalide.", { resultsPublishAt: "Date invalide." });

  const data = {
    ...rest,
    examsStart: examsStart || null,
    examsEnd: examsEnd || null,
    resultsPublishAt: publishAt,
  };
  await db.update(examSessions).set(data).where(eq(examSessions.id, id));
  await audit({
    actorId: user.id,
    action: "session.modifier",
    table: "exam_sessions",
    recordId: id,
    oldData: before,
    newData: data,
  });
  refresh();
  return ok("Paramètres de session enregistrés.");
}

/** Retour sur une publication (OFF-07 : irréversible sans action de l'Admin). */
export async function unpublishResults(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = Number(form.get("id"));
  await requireDb().update(examSessions).set({ resultsPublishAt: null }).where(eq(examSessions.id, id));
  await audit({ actorId: user.id, action: "resultats.depublier", table: "exam_sessions", recordId: id });
  refresh();
  return ok("Publication annulée : les résultats ne sont plus visibles.");
}

/* ---------- Actualités (ADM-02) ---------- */

const NewsInput = z.object({
  title: z.string().trim().min(8, "Titre trop court.").max(140),
  excerpt: z.string().trim().min(10, "Résumé trop court.").max(240),
  body: z.string().trim().min(20, "Texte trop court.").max(8000),
  category: z.string().trim().min(3).max(40),
  importance: z.enum(["low", "normal", "high", "urgent"]),
  illustration: z.enum(["reforme", "calendrier", "coefficients", "inscription", "sport", "resultats"]),
  publish: z.string().optional(),
});

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

export async function saveNews(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = NewsInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const { publish, ...data } = parsed.data;
  const id = Number(form.get("id")) || null;
  const db = requireDb();
  if (id) {
    const [before] = await db.select().from(news).where(eq(news.id, id));
    if (!before) return fail("Actualité introuvable.");
    const publishedAt = publish ? (before.publishedAt ?? new Date()) : null;
    await db
      .update(news)
      .set({ ...data, publishedAt })
      .where(eq(news.id, id));
    await audit({
      actorId: user.id,
      action: "actualite.modifier",
      table: "news",
      recordId: id,
      newData: data,
    });
  } else {
    let slug = slugify(data.title);
    const [exists] = await db.select({ id: news.id }).from(news).where(eq(news.slug, slug));
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;
    const [created] = await db
      .insert(news)
      .values({ ...data, slug, authorId: user.id, publishedAt: publish ? new Date() : null })
      .returning();
    await audit({
      actorId: user.id,
      action: "actualite.creer",
      table: "news",
      recordId: created.id,
      newData: data,
    });
  }
  refresh();
  return ok(publish ? "Actualité publiée sur le site." : "Brouillon enregistré.");
}

export async function archiveNews(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [n] = await db.select().from(news).where(eq(news.id, id));
  if (!n) return fail("Actualité introuvable.");
  await db
    .update(news)
    .set({ archivedAt: n.archivedAt ? null : new Date() })
    .where(eq(news.id, id));
  await audit({
    actorId: user.id,
    action: "actualite.archiver",
    table: "news",
    recordId: id,
    newData: { archived: !n.archivedAt },
  });
  refresh();
  return ok(n.archivedAt ? "Actualité restaurée." : "Actualité archivée : retirée du site.");
}
