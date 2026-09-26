"use server";

export type LoginState = { message: string } | null;

/**
 * Les espaces Candidat, École, Office du Bac et Admin arrivent dans la phase
 * suivante (authentification sur la même base PostgreSQL). Pour l'instant, la
 * page explique le fonctionnement sans rien enregistrer.
 */
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const id = String(form.get("identifiant") ?? "").trim();
  if (!id) return { message: "Saisissez votre matricule ou identifiant." };
  return {
    message:
      "Les espaces personnels ouvrent bientôt. Gardez précieusement votre convocation : vos identifiants y figurent.",
  };
}
