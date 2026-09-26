"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDb } from "@/db";
import { examSessions } from "@/db/schema";
import { candidates, users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { checkPassword, createSession, HOME_BY_ROLE, LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/auth";

export type LoginState = { message: string } | null;

const Login = z.object({
  identifiant: z.string().trim().min(1, "Saisissez votre matricule ou identifiant."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
  suite: z.string().optional(),
});

const WRONG = "Identifiant ou mot de passe incorrect.";

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = Login.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const { identifiant, password, suite } = parsed.data;
  const db = requireDb();

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = lower(${identifiant})`)
    .limit(1);
  if (!user) return { message: WRONG };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      message: `Compte verrouillé après ${MAX_FAILED_ATTEMPTS} essais. Réessayez dans ${minutes} min.`,
    };
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
    });
    return {
      message: locked
        ? `Compte verrouillé pour ${LOCK_MINUTES} minutes après ${MAX_FAILED_ATTEMPTS} essais.`
        : `${WRONG} Encore ${MAX_FAILED_ATTEMPTS - attempts} essai(s) avant verrouillage.`,
    };
  }

  if (!user.isActive) return { message: "Compte désactivé. Adressez-vous à l'Office du Bac." };

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
    // RG-15 : compte fermé quelques semaines après un ajournement ou une exclusion.
    const closed =
      c?.status === "disabled" ||
      (c &&
        !c.reactivatedAt &&
        ["failed", "fraud"].includes(c.status) &&
        c.publishAt &&
        Date.now() > c.publishAt.getTime() + c.days * 86400000);
    if (closed)
      return { message: "Votre compte est désactivé. L'Office du Bac peut le réactiver sur demande." };
  }

  await db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  await createSession(user.id, user.role);
  await audit({ actorId: user.id, action: "connexion", table: "users", recordId: user.id });

  const home = HOME_BY_ROLE[user.role];
  const safeSuite = suite && suite.startsWith(home) && !suite.startsWith("//") ? suite : home;
  redirect(user.mustChangePassword ? "/compte/mot-de-passe" : safeSuite);
}
