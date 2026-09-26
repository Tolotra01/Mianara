import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions, subjects } from "@/db/schema";
import { authSessions, candidates, teacherProfiles, users } from "@/db/schema-gestion";
import { isCandidateAccessClosed } from "@/lib/candidate-access";
import { type CurrentUser, userForToken } from "./auth";
import { qrPublicKeyRaw, sha256 } from "./crypto";

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

/* ------------------------------------------------------------------ */
/* Application Candidat (apprentissage, coaching, synchronisation)     */
/* ------------------------------------------------------------------ */

type MobilePrincipal = {
  userId: string;
  candidateId: string;
  serieCode: string;
  mustChangePassword: boolean;
  matricule: string;
  firstName: string;
  lastName: string;
  status: string;
  sessionYear: number;
};

const windows = new Map<string, number[]>();

/** In-process request limiter; deploy shared rate limiting at the edge for multi-instance production. */
export function mobileRateLimited(key: string, maximum: number, intervalMs: number): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((time) => now - time < intervalMs);
  if (!windows.has(key) && windows.size >= 5000) {
    for (const [bucket, timestamps] of windows) {
      if (timestamps.every((time) => now - time >= 15 * 60_000)) windows.delete(bucket);
    }
    if (windows.size >= 5000) return true;
  }
  recent.push(now);
  windows.set(key, recent);
  return recent.length > maximum;
}

export function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local").slice(0, 80);
}

export function mobileJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", pragma: "no-cache" },
  });
}

export function hasOversizedBody(request: Request, maximumBytes: number): boolean {
  const length = Number(request.headers.get("content-length"));
  return Number.isFinite(length) && length > maximumBytes;
}

export async function readJsonBody(
  request: Request,
  maximumBytes: number,
): Promise<{ value: unknown; tooLarge: boolean }> {
  const reader = request.body?.getReader();
  if (!reader) return { value: null, tooLarge: false };

  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel().catch(() => {});
        return { value: null, tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return { value: null, tooLarge: false };
  }
  text += decoder.decode();
  try {
    return { value: JSON.parse(text), tooLarge: false };
  } catch {
    return { value: null, tooLarge: false };
  }
}

export function getMobileBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  return /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization)?.[1] ?? null;
}

export async function getMobilePrincipal(request: Request): Promise<MobilePrincipal | null> {
  const token = getMobileBearerToken(request);
  if (!token) return null;

  const now = new Date();
  const [row] = await requireDb()
    .select({
      userId: users.id,
      mustChangePassword: users.mustChangePassword,
      candidateId: candidates.id,
      matricule: candidates.matricule,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      candidateStatus: candidates.status,
      reactivatedAt: candidates.reactivatedAt,
      serieCode: candidates.serieCode,
      sessionYear: examSessions.year,
      publishAt: examSessions.resultsPublishAt,
      accountDisableDays: examSessions.accountDisableDays,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .innerJoin(candidates, eq(candidates.userId, users.id))
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .where(
      and(
        eq(authSessions.id, sha256(token)),
        gt(authSessions.expiresAt, now),
        eq(users.role, "candidate"),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  if (
    !row ||
    isCandidateAccessClosed(
      {
        status: row.candidateStatus,
        reactivatedAt: row.reactivatedAt,
        publishAt: row.publishAt,
        days: row.accountDisableDays,
      },
      now,
    )
  ) {
    return null;
  }

  return {
    userId: row.userId,
    candidateId: row.candidateId,
    serieCode: row.serieCode,
    mustChangePassword: row.mustChangePassword,
    matricule: row.matricule,
    firstName: row.firstName,
    lastName: row.lastName,
    status: row.candidateStatus,
    sessionYear: row.sessionYear,
  };
}

export type TeacherMobilePrincipal = { userId: string; subjectCode: string; subjectName: string };

export async function getTeacherMobilePrincipal(request: Request): Promise<TeacherMobilePrincipal | null> {
  const token = getMobileBearerToken(request);
  if (!token) return null;
  const [row] = await requireDb()
    .select({
      userId: users.id,
      subjectCode: teacherProfiles.subjectCode,
      subjectName: subjects.name,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .innerJoin(subjects, eq(subjects.code, teacherProfiles.subjectCode))
    .where(and(
      eq(authSessions.id, sha256(token)),
      gt(authSessions.expiresAt, new Date()),
      eq(users.role, "teacher"),
      eq(users.isActive, true),
    ))
    .limit(1);
  return row ?? null;
}
