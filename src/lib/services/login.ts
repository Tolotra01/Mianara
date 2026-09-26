import "server-only";
import { eq, sql } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions } from "@/db/schema";
import { candidates, users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/auth";
import { checkPassword } from "@/lib/password";

const WRONG = "Identifiant ou mot de passe incorrect.";

export type AuthResult = { user: typeof users.$inferSelect } | { error: string };

/**
 * Vérifie des identifiants (web et application mobile) : verrouillage après
 * 5 échecs, compte désactivé, fermeture des comptes candidats (RG-15).
 */
export async function authenticate(
  identifiant: string,
  password: string,
  channel: "web" | "mobile" = "web",
): Promise<AuthResult> {
  const db = requireDb();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = lower(${identifiant.trim()})`)
    .limit(1);
  if (!user) return { error: WRONG };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Compte verrouillé après ${MAX_FAILED_ATTEMPTS} essais. Réessayez dans ${minutes} min.` };
  }

  if (!(await checkPassword(password, user.passwordHash))) {
    const attempts = user.failedAttempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      })
      .where(eq(users.id, user.id));
    await audit({
      actorId: user.id,
      action: locked ? "connexion.verrouillage" : "connexion.echec",
      table: "users",
      recordId: user.id,
      newData: { channel },
    });
    return {
      error: locked
        ? `Compte verrouillé pour ${LOCK_MINUTES} minutes après ${MAX_FAILED_ATTEMPTS} essais.`
        : `${WRONG} Encore ${MAX_FAILED_ATTEMPTS - attempts} essai(s) avant verrouillage.`,
    };
  }

  if (!user.isActive) return { error: "Compte désactivé. Adressez-vous à l'Office du Bac." };

  if (user.role === "candidate") {
    const [c] = await db
      .select({
        status: candidates.status,
        reactivatedAt: candidates.reactivatedAt,
        publishAt: examSessions.resultsPublishAt,
        days: examSessions.accountDisableDays,
      })
      .from(candidates)
      .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
      .where(eq(candidates.userId, user.id))
      .limit(1);
    const closed =
      c?.status === "disabled" ||
      (c &&
        !c.reactivatedAt &&
        ["failed", "fraud"].includes(c.status) &&
        c.publishAt &&
        Date.now() > c.publishAt.getTime() + c.days * 86400000);
    if (closed)
      return { error: "Votre compte est désactivé. L'Office du Bac peut le réactiver sur demande." };
  }

  await db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  await audit({
    actorId: user.id,
    action: "connexion",
    table: "users",
    recordId: user.id,
    newData: { channel },
  });
  return { user };
}
