import { z } from "zod";
import { requireDb } from "@/db";
import { verifyQr } from "@/lib/crypto";
import { ApiError, handler, json, mobileUser } from "@/lib/mobile-api";
import { extractMatricule, extractToken } from "@/lib/qr-content";
import { deliverRequest } from "@/lib/services/requests";
import { candidates, documentRequests } from "@/db/schema-gestion";
import { eq } from "drizzle-orm";

const Body = z.object({
  requestId: z.uuid(),
  /** Contenu du QR de la convocation, scanné au guichet (SCN-06). */
  qr: z.string().min(10).max(2000),
  identityChecked: z.literal(true, { error: "Confirmez le contrôle d'identité." }),
  deviceId: z.string().max(80).optional(),
});

/** Remise d'un relevé ou d'un diplôme : la convocation scannée doit être celle du candidat. */
export const POST = handler(async (request: Request) => {
  const user = await mobileUser(request, { roles: ["office"] });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    throw new ApiError(400, "INVALID", parsed.error.issues[0]?.message ?? "Demande invalide.");
  const db = requireDb();
  // Ancien QR signé : signature vérifiée. Sinon, matricule lu dans le QR ; le
  // contrôle d'identité (photo, pièce) confirmé par l'agent fait foi.
  const token = extractToken(parsed.data.qr);
  let candidateId = token ? verifyQr(token) : null;
  if (token && !candidateId) throw new ApiError(400, "INVALID_QR", "QR code invalide ou falsifié.");
  if (!candidateId) {
    const matricule = extractMatricule(parsed.data.qr);
    if (!matricule) throw new ApiError(400, "INVALID_QR", "QR code illisible : matricule introuvable.");
    const [c] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.matricule, matricule))
      .limit(1);
    if (!c) throw new ApiError(404, "UNKNOWN_CANDIDATE", "Aucun candidat ne correspond à ce QR code.");
    candidateId = c.id;
  }
  const [req] = await db
    .select({ candidateId: documentRequests.candidateId })
    .from(documentRequests)
    .where(eq(documentRequests.id, parsed.data.requestId));
  if (!req || req.candidateId !== candidateId)
    throw new ApiError(
      409,
      "WRONG_CANDIDATE",
      "Cette convocation n'appartient pas au candidat de la demande.",
    );
  const res = await db.transaction((tx) =>
    deliverRequest(parsed.data.requestId, user.officeId, user.id, tx, {
      deviceId: parsed.data.deviceId ?? null,
    }),
  );
  if ("error" in res) throw new ApiError(409, "NOT_DELIVERABLE", res.error!);
  return json({ ok: true, message: `${res.label} remis : retrait enregistré.` });
});
