"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { coachingPaymentSettings, coachingPayments, coachingSessions, learningListings, teacherDocuments, teacherProfiles } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

const Decision = z.enum(["approve", "reject"]);

const MerchantNumber = z
  .string()
  .trim()
  .min(5)
  .max(25)
  .regex(/^\+?[0-9][0-9 ]{3,23}[0-9]$/, "Numéro Orange Money invalide.");

export async function saveCoachingMerchantNumber(form: FormData) {
  const admin = await requireUser(["admin"]);
  const parsed = MerchantNumber.safeParse(form.get("merchantNumber"));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Numéro Orange Money invalide.");
  }
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
}

export async function reviewTeacherDocument(form: FormData) {
  const admin = await requireUser(["admin"]);
  const id = z.uuid().safeParse(form.get("id"));
  const decision = Decision.safeParse(form.get("decision"));
  if (!id.success || !decision.success) return;
  const db = requireDb();
  await db.transaction(async (tx) => {
    const [document] = await tx.select().from(teacherDocuments).where(eq(teacherDocuments.id, id.data)).limit(1);
    if (!document || document.status !== "pending") return;
    const status = decision.data === "approve" ? "approved" : "rejected";
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
  refresh();
}

const ListingReview = z.object({
  id: z.uuid(),
  decision: Decision,
  priceAmount: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]),
  note: z.string().trim().max(500),
});
export async function reviewLearningListing(form: FormData) {
  const admin = await requireUser(["admin"]);
  const parsed = ListingReview.safeParse({
    id: form.get("id"), decision: form.get("decision"), priceAmount: form.get("priceAmount"), note: form.get("note") ?? "",
  });
  if (!parsed.success) return;
  const [entry] = await requireDb().select().from(learningListings)
    .where(eq(learningListings.id, parsed.data.id)).limit(1);
  if (!entry || entry.reviewStatus !== "pending") return;
  const status = parsed.data.decision === "approve" ? "approved" : "rejected";
  const priceAmount = parsed.data.priceAmount === "" ? null : parsed.data.priceAmount;
  if (status === "approved" && entry.kind === "coaching" && (!priceAmount || priceAmount <= 0)) return;
  if (status === "approved" && entry.kind !== "coaching" && priceAmount !== null && priceAmount > 0) return;
  const db = requireDb();
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
}

export async function reviewCoachingPayment(form: FormData) {
  const admin = await requireUser(["admin"]);
  const id = z.uuid().safeParse(form.get("id"));
  const decision = Decision.safeParse(form.get("decision"));
  if (!id.success || !decision.success) return;
  const db = requireDb();
  await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(coachingPayments)
      .where(eq(coachingPayments.id, id.data)).limit(1);
    if (!payment || payment.status !== "pending") return;
    const status = decision.data === "approve" ? "approved" : "rejected";
    if (status === "approved") {
      const [listing] = await tx.select({ status: learningListings.reviewStatus })
        .from(learningListings).where(eq(learningListings.id, payment.listingId)).limit(1);
      if (listing?.status !== "approved") return;
    }
    await tx.update(coachingPayments).set({ status, reviewedBy: admin.id, reviewedAt: new Date() })
      .where(and(eq(coachingPayments.id, payment.id), eq(coachingPayments.status, "pending")));
    if (status === "approved") await tx.update(coachingSessions).set({ status: "active" })
      .where(eq(coachingSessions.paymentId, payment.id));
    await audit({ actorId: admin.id, action: `coaching.paiement.${status}`, table: "coaching_payments",
      recordId: payment.id, newData: { listingId: payment.listingId, amount: payment.amount, status } }, tx);
  });
  refresh();
}
