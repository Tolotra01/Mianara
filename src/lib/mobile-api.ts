import "server-only";
import { type CurrentUser, userForToken } from "./auth";
import { qrPublicKeyRaw } from "./crypto";

/**
 * API de l'application mobile « Mianara Contrôle » (surveillants et agents de l'Office).
 * Authentification par jeton « Bearer » stocké dans la table des sessions.
 */
export type MobileRole = "supervisor" | "office";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const bearer = (request: Request) =>
  request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim() ?? null;

/** Utilisateur de l'application ; seuls les surveillants et les agents de l'Office y ont accès. */
export async function mobileUser(
  request: Request,
  opts: { allowPasswordChange?: boolean; roles?: MobileRole[] } = {},
) {
  const token = bearer(request);
  if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Connexion requise.");
  const user = await userForToken(token);
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Session expirée : reconnectez-vous.");
  const roles = opts.roles ?? ["supervisor", "office"];
  if (!roles.includes(user.role as MobileRole))
    throw new ApiError(403, "FORBIDDEN", "Cette fonction n'est pas disponible pour votre compte.");
  if (user.mustChangePassword && !opts.allowPasswordChange) {
    throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED", "Choisissez d'abord votre mot de passe personnel.");
  }
  if (!user.officeId) throw new ApiError(403, "FORBIDDEN", "Compte sans Office de rattachement.");
  return user as CurrentUser & { officeId: number; role: MobileRole };
}

const NETWORK_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENETUNREACH", "EAI_AGAIN", "CONNECT_TIMEOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED"]);

function isDbUnreachable(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined, i = 0; e && i < 5; e = e.cause as typeof e, i++) {
    if (e.code && NETWORK_CODES.has(e.code)) return true;
  }
  return false;
}

/** Enveloppe commune : erreurs métier → JSON { error: { code, message } }. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError)
        return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      console.error("API mobile :", err);
      // Base injoignable (réseau lent, pooler Neon) : 503, l'application réessaie seule.
      if (isDbUnreachable(err))
        return Response.json(
          {
            error: {
              code: "DB_UNAVAILABLE",
              message: "La base de données ne répond pas pour le moment. Réessayez dans un instant.",
            },
          },
          { status: 503 },
        );
      return Response.json(
        { error: { code: "SERVER_ERROR", message: "Erreur du serveur. Réessayez." } },
        { status: 500 },
      );
    }
  };
}

export const json = (data: unknown, init?: ResponseInit) =>
  Response.json(data, { ...init, headers: { "cache-control": "no-store", ...init?.headers } });

/** Clé publique Ed25519 (32 octets, base64) : l'application vérifie les QR hors ligne. */
export const publicKey = () => qrPublicKeyRaw();
