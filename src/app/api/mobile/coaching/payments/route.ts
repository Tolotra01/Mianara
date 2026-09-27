import { and, eq, inArray } from "drizzle-orm";
import { requireDb, requireTxDb } from "@/db";
import { coachingPayments, coachingSessions, learningListings, teacherProfiles, users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { clientIp, getMobilePrincipal, hasOversizedBody, mobileJson, mobileRateLimited, readJsonBody } from "@/lib/mobile-api";
import { coachingPaymentInput } from "@/lib/learning-contract";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 8192) return mobileJson({ error: "Requête trop volumineuse." }, 413);
  try {
    const principal = await getMobilePrincipal(request);
    if (!principal) return mobileJson({ error: "Session mobile invalide ou expirée." }, 401);
    if (mobileRateLimited(`coach-payment:${clientIp(request)}:${principal.candidateId}`, 20, 60 * 60_000))
      return mobileJson({ error: "Trop de déclarations de paiement. Réessayez plus tard." }, 429);
    if (principal.mustChangePassword) return mobileJson({ error: "Modifiez d'abord votre mot de passe." }, 403);
    const body = await readJsonBody(request, 8192);
    if (body.tooLarge) return mobileJson({ error: "Requête trop volumineuse." }, 413);
    const parsed = coachingPaymentInput.safeParse(body.value);
    if (!parsed.success) return mobileJson({ error: "Paiement invalide." }, 400);
    const db = requireDb();
    const [listing] = await db.select({
      id: learningListings.id, price: learningListings.priceAmount, kind: learningListings.kind, series: learningListings.series,
    }).from(learningListings).innerJoin(teacherProfiles, eq(teacherProfiles.userId, learningListings.teacherId))
      .innerJoin(users, eq(users.id, learningListings.teacherId))
      .where(and(eq(learningListings.id, parsed.data.listingId), eq(learningListings.reviewStatus, "approved"),
        eq(teacherProfiles.verificationStatus, "verified"), eq(users.isActive, true))).limit(1);
    if (!listing || !listing.series.includes(principal.serieCode) ||
      listing.kind !== "coaching" || !listing.price || listing.price <= 0) {
      return mobileJson({ error: "Offre de coaching indisponible." }, 404);
    }
    const [existing] = await db.select({ id: coachingPayments.id }).from(coachingPayments)
      .where(and(eq(coachingPayments.candidateId, principal.candidateId), eq(coachingPayments.listingId, listing.id),
        inArray(coachingPayments.status, ["pending", "approved"]))).limit(1);
    if (existing) return mobileJson({ error: "Un paiement pour ce coaching est déjà en cours ou validé." }, 409);
    const [payment] = await requireTxDb().transaction(async (tx) => {
      const [created] = await tx.insert(coachingPayments).values({
        listingId: listing.id, candidateId: principal.candidateId,
        transactionReference: parsed.data.transactionReference, amount: listing.price!,
      }).returning({ id: coachingPayments.id, status: coachingPayments.status });
      await tx.insert(coachingSessions).values({
        paymentId: created.id, listingId: listing.id, candidateId: principal.candidateId,
      });
      await audit({ actorId: principal.userId, action: "coaching.paiement.soumis", table: "coaching_payments",
        recordId: created.id, newData: { listingId: listing.id, amount: listing.price, status: created.status } }, tx);
      return [created];
    });
    return mobileJson({ payment });
  } catch (error) {
    const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
    if ((error && typeof error === "object" && "code" in error && error.code === "23505")
      || (cause && typeof cause === "object" && "code" in cause && cause.code === "23505")) {
      return mobileJson({ error: "Cette référence de transaction a déjà été utilisée." }, 409);
    }
    console.error("Mobile coaching payment:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
