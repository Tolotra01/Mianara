import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidates, coachingPayments, coachingSessions, learningListings, teacherProfiles, users } from "@/db/schema-gestion";
import { presentLearningItem } from "./learning-contract";

export const SERIES = ["L", "S", "OSE", "TI", "TGC", "TT", "TA"] as const;

export async function candidateLearningItems(candidateId: string) {
  const db = requireDb();
  const [candidate] = await db.select({ serieCode: candidates.serieCode }).from(candidates)
    .where(eq(candidates.id, candidateId)).limit(1);
  if (!candidate) return [];
  const listings = await db.select({
    id: learningListings.id,
    kind: learningListings.kind,
    subjectCode: learningListings.subjectCode,
    title: learningListings.title,
    description: learningListings.description,
    content: learningListings.content,
    priceAmount: learningListings.priceAmount,
    durationMinutes: learningListings.durationMinutes,
  }).from(learningListings).innerJoin(teacherProfiles, eq(teacherProfiles.userId, learningListings.teacherId))
    .innerJoin(users, eq(users.id, learningListings.teacherId))
    .where(and(
      eq(learningListings.reviewStatus, "approved"),
      eq(teacherProfiles.verificationStatus, "verified"),
      eq(users.isActive, true),
      sql`${learningListings.series} @> array[${candidate.serieCode}]::text[]`,
    ));
  const purchases = listings.length ? await db.select({
    listingId: coachingSessions.listingId,
    status: coachingPayments.status,
    sessionStatus: coachingSessions.status,
    createdAt: coachingPayments.createdAt,
  })
    .from(coachingSessions).innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
    .where(and(
      eq(coachingSessions.candidateId, candidateId),
      inArray(coachingSessions.listingId, listings.map(({ id }) => id)),
    )).orderBy(desc(coachingPayments.createdAt)) : [];
  const paymentStatus = new Map<string, { status: string; sessionStatus: string }>();
  for (const payment of purchases) {
    if (!paymentStatus.has(payment.listingId)) {
      paymentStatus.set(payment.listingId, {
        status: payment.status,
        sessionStatus: payment.sessionStatus,
      });
    }
  }
  return listings.map((item) => ({
    ...presentLearningItem(
      item,
      paymentStatus.get(item.id)?.status === "approved" &&
        paymentStatus.get(item.id)?.sessionStatus === "active",
    ),
    paymentStatus: paymentStatus.get(item.id)?.status ?? null,
  }));
}
