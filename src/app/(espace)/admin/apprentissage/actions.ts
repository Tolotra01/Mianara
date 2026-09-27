"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { coachingPaymentSettings, coachingPayments, coachingSessions, learningListings, teacherDocuments, teacherProfiles } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { fail, ok, type ActionState, zodErrors } from "@/lib/action";

const Decision = z.enum(["approve", "reject"]);

const MerchantNumber = z
  .string()
  .trim()
  .min(5)
  .max(25)
  .regex(/^\+?[0-9][0-9 ]{3,23}[0-9]$/, "Numéro Orange Money invalide.");

export async function saveCoachingMerchantNumber(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const parsed = MerchantNumber.safeParse(form.get("merchantNumber"));
  if (!parsed.success) return fail("Numéro Orange Money invalide.", {
    merchantNumber: parsed.error.issues[0]?.message ?? "Numéro invalide.",
  });
  const merchantNumber = parsed.data.replace(/\s+/g, " ");
  const db = requireDb();
  await db
    .insert(coachingPaymentSettings)
    .values({ id: 1, merchantNumber, updatedBy: admin.id, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: coachingPaymentSettings.id,
      set: { merchantNumber, updatedBy: admin.id, updatedAt: new Date() },
    });
  await audit({
    actorId: admin.id,
    action: "coaching.numero_marchand.modifie",
    table: "coaching_payment_settings",
    recordId: 1,
  });
  refresh();
  return ok("Numéro marchand enregistré.");
}

export async function reviewTeacherDocument(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const id = z.uuid().safeParse(form.get("id"));
  const decision = Decision.safeParse(form.get("decision"));
  if (!id.success || !decision.success) return fail("Décision invalide.");
  const status = decision.data === "approve" ? "approved" : "rejected";
  let problem: string | null = null;
  const db = requireTxDb();
  await db.transaction(async (tx) => {
    const [document] = await tx.select().from(teacherDocuments).where(eq(teacherDocuments.id, id.data)).limit(1);
    if (!document) { problem = "Justificatif introuvable."; return; }
    if (document.status !== "pending") { problem = "Ce justificatif a déjà été examiné."; return; }
    await tx.update(teacherDocuments).set({ status, reviewedAt: new Date() })
      .where(and(eq(teacherDocuments.id, id.data), eq(teacherDocuments.status, "pending")));
    const allDocs = await tx.select({ kind: teacherDocuments.kind, status: teacherDocuments.status })
      .from(teacherDocuments).where(eq(teacherDocuments.teacherId, document.teacherId));
    const nextStatus = allDocs.some((doc) => doc.status === "rejected") ? "rejected"
      : allDocs.length === 2 && allDocs.every((doc) => doc.status === "approved") ? "verified" : "pending";
    await tx.update(teacherProfiles).set({
      verificationStatus: nextStatus, reviewedBy: admin.id, reviewedAt: new Date(),
    }).where(eq(teacherProfiles.userId, document.teacherId));
    await audit({ actorId: admin.id, action: `enseignant.justificatif.${status}`, table: "teacher_documents",
      recordId: id.data, newData: { teacherId: document.teacherId, kind: document.kind, status } }, tx);
  });
  if (problem) return fail(problem);
  refresh();
  return ok(`Justificatif ${status === "approved" ? "approuvé" : "refusé"}.`);
}

const ListingReview = z.object({
  id: z.uuid(),
  decision: Decision,
  priceAmount: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]),
  note: z.string().trim().max(500),
});
export async function reviewLearningListing(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const parsed = ListingReview.safeParse({
    id: form.get("id"), decision: form.get("decision"), priceAmount: form.get("priceAmount"), note: form.get("note") ?? "",
  });
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const [entry] = await requireDb().select().from(learningListings)
    .where(eq(learningListings.id, parsed.data.id)).limit(1);
  if (!entry) return fail("Offre introuvable.");
  if (entry.reviewStatus !== "pending") return fail("Cette offre a déjà été examinée.");
  const status = parsed.data.decision === "approve" ? "approved" : "rejected";
  const priceAmount = parsed.data.priceAmount === "" ? null : parsed.data.priceAmount;
  if (status === "approved" && entry.kind === "coaching" && (!priceAmount || priceAmount <= 0))
    return fail("Fixez un prix MGA supérieur à 0 pour valider une offre de coaching.", { priceAmount: "Prix obligatoire." });
  if (status === "approved" && entry.kind !== "coaching" && priceAmount !== null && priceAmount > 0)
    return fail("Seules les offres de coaching peuvent être payantes.", { priceAmount: "Retirez le prix pour cette offre." });
  const db = requireTxDb();
  await db.transaction(async (tx) => {
    await tx.update(learningListings).set({
      reviewStatus: status, reviewNote: parsed.data.note || null, reviewedBy: admin.id, reviewedAt: new Date(),
      priceAmount,
    }).where(and(eq(learningListings.id, entry.id), eq(learningListings.reviewStatus, "pending")));
    await audit({ actorId: admin.id, action: `apprentissage.offre.${status}`, table: "learning_listings",
      recordId: entry.id, oldData: { reviewStatus: entry.reviewStatus, priceAmount: entry.priceAmount },
      newData: { reviewStatus: status, priceAmount, reviewNote: parsed.data.note || null } }, tx);
  });
  refresh();
  return ok(status === "approved" ? "Offre approuvée et publiée." : "Offre refusée.");
}

export async function reviewCoachingPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const id = z.uuid().safeParse(form.get("id"));
  const decision = Decision.safeParse(form.get("decision"));
  if (!id.success || !decision.success) return fail("Décision invalide.");
  const status = decision.data === "approve" ? "approved" : "rejected";
  let problem: string | null = null;
  const db = requireTxDb();
  await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(coachingPayments)
      .where(eq(coachingPayments.id, id.data)).limit(1);
    if (!payment) { problem = "Paiement introuvable."; return; }
    if (payment.status !== "pending") { problem = "Ce paiement a déjà été traité."; return; }
    if (status === "approved") {
      const [listing] = await tx.select({ status: learningListings.reviewStatus })
        .from(learningListings).where(eq(learningListings.id, payment.listingId)).limit(1);
      if (listing?.status !== "approved") { problem = "L'offre de coaching doit être approuvée avant de valider ce paiement."; return; }
    }
    await tx.update(coachingPayments).set({ status, reviewedBy: admin.id, reviewedAt: new Date() })
      .where(and(eq(coachingPayments.id, payment.id), eq(coachingPayments.status, "pending")));
    if (status === "approved") await tx.update(coachingSessions).set({ status: "active" })
      .where(eq(coachingSessions.paymentId, payment.id));
    await audit({ actorId: admin.id, action: `coaching.paiement.${status}`, table: "coaching_payments",
      recordId: payment.id, newData: { listingId: payment.listingId, amount: payment.amount, status } }, tx);
  });
  if (problem) return fail(problem);
  refresh();
  return ok(status === "approved" ? "Paiement validé : la conversation est ouverte." : "Paiement refusé.");
}
