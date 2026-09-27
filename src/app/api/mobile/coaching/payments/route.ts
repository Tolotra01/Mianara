import { z } from "zod";
import { LearnError, learnCandidate, learnHandler, learnJson, readJson } from "@/lib/learn-api";
import { submitPayment } from "@/lib/services/learning";

const Body = z.object({ listingId: z.uuid(), transactionReference: z.string().trim().min(6).max(40) });

/** Référence Orange Money d'un achat (cours, exercices ou tutorat), vérifiée ensuite par l'Administration. */
export const POST = learnHandler(async (request: Request) => {
  const { user, profile } = await learnCandidate(request);
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new LearnError(400, "INVALID", "Référence de transaction invalide.");
  const res = await submitPayment(
    user.id,
    profile.serieCode,
    parsed.data.listingId,
    parsed.data.transactionReference,
  );
  if ("error" in res) throw new LearnError(409, "PAYMENT_REFUSED", res.error!);
  return learnJson(
    {
      payment: res.payment,
      sessionId: res.sessionId,
      message: "Référence envoyée : l'accès s'ouvre dès la vérification du paiement.",
    },
    { status: 201 },
  );
});
