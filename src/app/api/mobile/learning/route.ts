import { getMobilePrincipal, mobileJson } from "@/lib/mobile-api";
import { candidateLearningItems } from "@/lib/learning";
import { requireDb } from "@/db";
import { coachingPaymentSettings } from "@/db/schema-gestion";

export async function GET(request: Request) {
  try {
    const principal = await getMobilePrincipal(request);
    if (!principal) return mobileJson({ error: "Session mobile invalide ou expirée." }, 401);
    if (principal.mustChangePassword) return mobileJson({ error: "Modifiez d'abord votre mot de passe." }, 403);
    const [settings] = await requireDb()
      .select({ merchantNumber: coachingPaymentSettings.merchantNumber })
      .from(coachingPaymentSettings)
      .limit(1);
    return mobileJson({
      items: await candidateLearningItems(principal.candidateId),
      payment: { merchantNumber: settings?.merchantNumber ?? null },
    });
  } catch (error) {
    console.error("Mobile learning:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
