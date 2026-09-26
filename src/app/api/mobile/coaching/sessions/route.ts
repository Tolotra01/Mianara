import { and, desc, eq, or } from "drizzle-orm";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { coachingPayments, coachingSessions, learningListings, teacherProfiles, users } from "@/db/schema-gestion";
import { getMobilePrincipal, mobileJson } from "@/lib/mobile-api";

export async function GET(request: Request) {
  try {
    const principal = await getMobilePrincipal(request);
    if (!principal) return mobileJson({ error: "Session mobile invalide ou expirée." }, 401);
    if (principal.mustChangePassword) return mobileJson({ error: "Modifiez d'abord votre mot de passe." }, 403);
    const sessions = await requireDb().select({
      id: coachingSessions.id,
      listingId: learningListings.id,
      subjectCode: learningListings.subjectCode,
      teacherSubject: subjects.name,
      status: coachingSessions.status,
    }).from(coachingSessions).innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
      .innerJoin(learningListings, eq(learningListings.id, coachingSessions.listingId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, learningListings.teacherId))
      .innerJoin(subjects, eq(subjects.code, teacherProfiles.subjectCode))
      .innerJoin(users, eq(users.id, learningListings.teacherId))
      .where(and(eq(coachingSessions.candidateId, principal.candidateId),
        eq(users.isActive, true),
        eq(teacherProfiles.verificationStatus, "verified"),
        eq(learningListings.reviewStatus, "approved"),
        or(
          and(eq(coachingPayments.status, "approved"), eq(coachingSessions.status, "active")),
          and(eq(coachingPayments.status, "pending"), eq(coachingSessions.status, "pending_payment")),
        )))
      .orderBy(desc(coachingSessions.createdAt));
    return mobileJson({ sessions });
  } catch (error) {
    console.error("Mobile coaching sessions:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
