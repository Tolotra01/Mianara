import { learnCandidate, learnHandler, learnJson } from "@/lib/learn-api";
import { catalogFor, getSetting, MERCHANT_KEY } from "@/lib/services/learning";

/** Catalogue validé pour la série du candidat ; le contenu n'est livré qu'une fois acquis. */
export const GET = learnHandler(async (request: Request) => {
  const { user, profile } = await learnCandidate(request);
  const [items, merchantNumber] = await Promise.all([
    catalogFor(user.id, profile.serieCode),
    getSetting(MERCHANT_KEY),
  ]);
  return learnJson({
    items: items.map(({ subjectName: _s, ...i }) => i),
    subjects: [...new Map(items.map((i) => [i.subjectCode, i.subjectName])).entries()].map(
      ([code, name]) => ({ code, name }),
    ),
    payment: { provider: "orange_money", merchantNumber },
  });
});
