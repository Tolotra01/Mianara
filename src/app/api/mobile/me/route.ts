import { accountPayload, learnHandler, learnJson, learnUser } from "@/lib/learn-api";

/** Profil du compte connecté (fiche candidat ou matière de l'enseignant). */
export const GET = learnHandler(async (request: Request) => {
  const { user } = await learnUser(request, { allowPasswordChange: true });
  return learnJson({ mustChangePassword: user.mustChangePassword, ...(await accountPayload(user)) });
});
