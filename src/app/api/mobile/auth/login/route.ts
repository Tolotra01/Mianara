import { and, desc, eq, or, sql } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions } from "@/db/schema";
import { authSessions, candidates, users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { isCandidateAccessClosed } from "@/lib/candidate-access";
import { checkPassword, LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/auth";
import { sessionToken, sha256 } from "@/lib/crypto";
import {
  clientIp,
  hasOversizedBody,
  mobileJson,
  mobileRateLimited,
  readJsonBody,
} from "@/lib/mobile-api";
import { MOBILE_LOGIN_BODY } from "@/lib/mobile-contract";

const INVALID_CREDENTIALS = "Identifiant ou mot de passe incorrect.";
const CONTROLLED_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60_000;

export async function POST(request: Request) {
  if (hasOversizedBody(request, 8192)) return mobileJson({ error: "Requête trop volumineuse." }, 413);

  const ip = clientIp(request);
  if (mobileRateLimited(`login:${ip}`, CONTROLLED_FAILURES, FAILURE_WINDOW_MS)) {
    return mobileJson({ error: "Trop de tentatives. Réessayez plus tard." }, 429);
  }

  const body = await readJsonBody(request, 8192);
  if (body.tooLarge) return mobileJson({ error: "Requête trop volumineuse." }, 413);
  const parsed = MOBILE_LOGIN_BODY.safeParse(body.value);
  if (!parsed.success) return mobileJson({ error: "Corps de requête invalide." }, 400);

  try {
    const db = requireDb();
    const { identifiant, password } = parsed.data;
    const [user] = await db
      .select({
        id: users.id,
        candidateId: candidates.id,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        failedAttempts: users.failedAttempts,
        lockedUntil: users.lockedUntil,
        mustChangePassword: users.mustChangePassword,
        matricule: candidates.matricule,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        serieCode: candidates.serieCode,
        candidateStatus: candidates.status,
        reactivatedAt: candidates.reactivatedAt,
        publishAt: examSessions.resultsPublishAt,
        accountDisableDays: examSessions.accountDisableDays,
      })
      .from(users)
      .innerJoin(candidates, eq(candidates.userId, users.id))
      .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
      .where(
        and(
          eq(users.role, "candidate"),
          or(
            sql`lower(${users.username}) = lower(${identifiant})`,
            sql`lower(${candidates.matricule}) = lower(${identifiant})`,
          ),
        ),
      )
      .orderBy(desc(sql`lower(${users.username}) = lower(${identifiant})`))
      .limit(1);

    if (!user) return mobileJson({ error: INVALID_CREDENTIALS }, 401);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return mobileJson({ error: INVALID_CREDENTIALS }, 401);
    }

    if (!(await checkPassword(password, user.passwordHash))) {
      const attempts = user.failedAttempts + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      await db
        .update(users)
        .set({
          failedAttempts: locked ? 0 : attempts,
          lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        })
        .where(eq(users.id, user.id));
      await audit({
        actorId: user.id,
        action: locked ? "connexion.verrouillage" : "connexion.echec",
        table: "users",
        recordId: user.id,
      });
      return mobileJson({ error: INVALID_CREDENTIALS }, 401);
    }

    if (
      !user.isActive ||
      isCandidateAccessClosed({
        status: user.candidateStatus,
        reactivatedAt: user.reactivatedAt,
        publishAt: user.publishAt,
        days: user.accountDisableDays,
      })
    ) {
      return mobileJson({ error: "Compte indisponible. Adressez-vous à l'Office du Bac." }, 403);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
    const token = sessionToken();
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now })
      .where(eq(users.id, user.id));
    await db.insert(authSessions).values({
      id: sha256(token),
      userId: user.id,
      expiresAt,
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    await audit({ actorId: user.id, action: "connexion.mobile", table: "users", recordId: user.id });

    return mobileJson(
      {
        token,
        mustChangePassword: user.mustChangePassword,
        candidate: {
          id: user.candidateId,
          matricule: user.matricule,
          firstName: user.firstName,
          lastName: user.lastName,
          serieCode: user.serieCode,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Mobile login:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
