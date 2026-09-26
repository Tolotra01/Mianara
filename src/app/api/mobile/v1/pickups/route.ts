import { and, asc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidates, documentRequests } from "@/db/schema-gestion";
import { handler, json, mobileUser } from "@/lib/mobile-api";

/** Guichet (agents de l'Office) : documents prêts à être remis. */
export const GET = handler(async (request: Request) => {
  const user = await mobileUser(request, { roles: ["office"] });
  const rows = await requireDb()
    .select({
      id: documentRequests.id,
      number: documentRequests.number,
      type: documentRequests.type,
      pickupAt: documentRequests.pickupAt,
      pickupPlace: documentRequests.pickupPlace,
      candidateId: candidates.id,
      matricule: candidates.matricule,
      lastName: candidates.lastName,
      firstName: candidates.firstName,
      serieCode: candidates.serieCode,
    })
    .from(documentRequests)
    .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
    .where(and(eq(candidates.officeId, user.officeId), eq(documentRequests.status, "pickup_scheduled")))
    .orderBy(asc(documentRequests.pickupAt));
  return json({ pickups: rows.map((r) => ({ ...r, pickupAt: r.pickupAt?.toISOString() ?? null })) });
});
