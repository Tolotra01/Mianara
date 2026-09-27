import "server-only";
import { type CurrentUser, userForToken } from "./auth";
import { bearer, isDbUnreachable } from "./mobile-api";
import { candidateProfile, teacherProfile } from "./services/learning";

/**
 * API de l'application candidat « Mianara Mobile » (révisions, apprentissage,
 * tutorat) et de l'espace enseignant mobile. Erreurs au format { error, code }.
 */
export class LearnError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type LearnRole = "candidate" | "teacher";

export async function learnUser(
  request: Request,
  opts: { roles?: LearnRole[]; allowPasswordChange?: boolean } = {},
) {
  const token = bearer(request);
  if (!token) throw new LearnError(401, "UNAUTHENTICATED", "Connexion requise.");
  const user = await userForToken(token);
  if (!user) throw new LearnError(401, "UNAUTHENTICATED", "Session expirée : reconnectez-vous.");
  const roles = opts.roles ?? ["candidate", "teacher"];
  if (!roles.includes(user.role as LearnRole))
    throw new LearnError(403, "FORBIDDEN", "Cette fonction n'est pas disponible pour votre compte.");
  if (user.mustChangePassword && !opts.allowPasswordChange)
    throw new LearnError(403, "PASSWORD_CHANGE_REQUIRED", "Choisissez d'abord votre mot de passe personnel.");
  return { user, token };
}

/** Candidat connecté et sa fiche (série, centre…). */
export async function learnCandidate(request: Request) {
  const { user } = await learnUser(request, { roles: ["candidate"] });
  const profile = await candidateProfile(user.id);
  if (!profile) throw new LearnError(403, "FORBIDDEN", "Fiche candidat introuvable.");
  return { user: user as CurrentUser, profile };
}

export function learnHandler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof LearnError)
        return Response.json({ error: err.message, code: err.code }, { status: err.status });
      console.error("API apprentissage :", err);
      if (isDbUnreachable(err))
        return Response.json(
          {
            error: "La base de données ne répond pas pour le moment. Réessayez dans un instant.",
            code: "DB_UNAVAILABLE",
          },
          { status: 503 },
        );
      return Response.json({ error: "Erreur du serveur. Réessayez.", code: "SERVER_ERROR" }, { status: 500 });
    }
  };
}

export const learnJson = (data: unknown, init?: ResponseInit) =>
  Response.json(data, { ...init, headers: { "cache-control": "no-store", ...init?.headers } });

export async function readJson(request: Request) {
  return request.json().catch(() => null);
}

/** Profil renvoyé à la connexion et par /me : identité, fiche candidat ou matière de l'enseignant. */
export async function accountPayload(user: Pick<CurrentUser, "id" | "role" | "username" | "fullName">) {
  const base = { role: user.role, user: { id: user.id, username: user.username, fullName: user.fullName } };
  if (user.role === "teacher") {
    const t = await teacherProfile(user.id);
    return { ...base, teacher: t ? { subjectCode: t.subjectCode, subjectName: t.subjectName } : null };
  }
  const c = await candidateProfile(user.id);
  return {
    ...base,
    candidate: c
      ? {
          id: c.id,
          matricule: c.matricule,
          firstName: c.firstName,
          lastName: c.lastName,
          serieCode: c.serieCode,
          serieName: c.serieName,
          kind: c.kind,
          schoolName: c.schoolName,
          center: c.center,
          city: c.city,
          room: c.room,
          seat: c.seat,
          sessionYear: c.sessionYear,
        }
      : null,
  };
}
