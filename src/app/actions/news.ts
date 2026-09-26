"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { news } from "@/db/schema";
import { users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit, notify, notifyMany } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

const Proposal = z.object({
  title: z.string().trim().min(8, "Titre trop court.").max(140),
  excerpt: z.string().trim().min(10, "Résumé trop court.").max(240),
  body: z.string().trim().min(20, "Texte trop court.").max(8000),
  category: z.string().trim().min(3).max(40),
  importance: z.enum(["low", "normal", "high", "urgent"]),
  illustration: z.enum(["reforme", "calendrier", "coefficients", "inscription", "sport", "resultats"]),
});

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** Un Office ou une école propose une actualité ; l'Admin décide de la publier. */
export async function proposeNews(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(["office", "school"]);
  const parsed = Proposal.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const label =
    user.role === "school" ? (user.schoolName ?? "Établissement") : (user.officeName ?? "Office du Bacc");
  const [created] = await db
    .insert(news)
    .values({
      ...parsed.data,
      slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
      reviewStatus: "pending",
      proposedBy: user.id,
      proposedByLabel: label,
      publishedAt: null,
    })
    .returning({ id: news.id });
  await audit({
    actorId: user.id,
    action: "actualite.proposer",
    table: "news",
    recordId: created.id,
    newData: parsed.data,
  });
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  await notifyMany(
    admins.map((a) => a.id),
    { title: "Actualité proposée", body: `${label} : « ${parsed.data.title} »`, link: "/admin/actualites" },
  );
  refresh();
  return ok("Proposition envoyée à l'Administration.");
}

/** Décision de l'Admin sur une proposition : publiée sur la vitrine ou refusée avec un motif. */
export async function reviewNews(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser(["admin"]);
  const id = Number(form.get("id"));
  const decision = form.get("decision") === "approve" ? "approved" : "rejected";
  const note = String(form.get("note") ?? "").trim();
  if (decision === "rejected" && note.length < 5) return fail("Indiquez le motif du refus.");
  const db = requireDb();
  const [item] = await db.select().from(news).where(eq(news.id, id));
  if (!item || item.reviewStatus !== "pending") return fail("Proposition introuvable ou déjà traitée.");
  await db
    .update(news)
    .set({
      reviewStatus: decision,
      reviewNote: note || null,
      publishedAt: decision === "approved" ? new Date() : null,
      authorId: user.id,
    })
    .where(eq(news.id, id));
  await audit({
    actorId: user.id,
    action: decision === "approved" ? "actualite.valider" : "actualite.refuser",
    table: "news",
    recordId: id,
  });
  await notify(item.proposedBy, {
    title: decision === "approved" ? "Actualité publiée" : "Actualité non retenue",
    body:
      decision === "approved" ? `« ${item.title} » est en ligne sur Mianara.` : `« ${item.title} » : ${note}`,
    link: decision === "approved" ? `/actualites/${item.slug}` : undefined,
  });
  refresh();
  return ok(
    decision === "approved"
      ? "Actualité publiée sur le site."
      : "Proposition refusée : l'auteur est prévenu.",
  );
}
