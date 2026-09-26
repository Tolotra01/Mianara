import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireDb } from "@/db";
import { authSessions, candidates, offices, schools, users } from "@/db/schema-gestion";
import { sessionToken, sha256 } from "./crypto";

import type { Role } from "./auth-shared";

export type { Role };
export { ROLE_LABEL } from "./auth-shared";

export const SESSION_COOKIE = "mianara_session";
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

/** Page d'accueil de chaque espace. */
export const HOME_BY_ROLE: Record<Role, string> = {
  admin: "/admin",
  office: "/office",
  supervisor: "/surveillant",
  candidate: "/candidat",
  school: "/ecole",
  teacher: "/enseignant",
};

export { checkPassword, hashPassword } from "./password";

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}

export async function createSession(userId: string, role: Role) {
  const db = requireDb();
  const token = sessionToken();
  // Candidat : 7 jours. Personnel : une journée de travail.
  const hours = role === "candidate" ? 24 * 7 : 12;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
  const meta = await requestMeta();
  await db.insert(authSessions).values({ id: sha256(token), userId, expiresAt, ...meta });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token)
    await requireDb()
      .delete(authSessions)
      .where(eq(authSessions.id, sha256(token)));
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  role: Role;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  officeId: number | null;
  officeName: string | null;
  schoolId: number | null;
  schoolName: string | null;
  mustChangePassword: boolean;
};

/** Utilisateur connecté (une seule lecture par requête). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = requireDb();
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      officeId: users.officeId,
      officeName: offices.name,
      schoolId: users.schoolId,
      schoolName: schools.name,
      mustChangePassword: users.mustChangePassword,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .leftJoin(offices, eq(offices.id, users.officeId))
    .leftJoin(schools, eq(schools.id, users.schoolId))
    .where(
      and(
        eq(authSessions.id, sha256(token)),
        gt(authSessions.expiresAt, new Date()),
        eq(users.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
});

/**
 * Exige un utilisateur connecté ayant l'un des rôles donnés.
 * Tant que le mot de passe temporaire n'est pas changé, seule la page de
 * changement de mot de passe est accessible (CAN-02).
 */
export async function requireUser(roles: Role[], opts: { allowPasswordChange?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/compte/mot-de-passe");
  if (!roles.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}

/** Cookie posé quand l'Admin visite l'espace d'un Office (consultation seule). */
export const OFFICE_VISIT_COOKIE = "mianara_office_visit";

export type OfficeContext = CurrentUser & { officeId: number; officeName: string | null; visiting: boolean };

/**
 * Espace Office : un agent de l'Office, ou l'Admin en visite (lecture seule).
 * À utiliser dans les pages ; les actions d'écriture utilisent requireOfficeAgent().
 */
export async function requireOffice(): Promise<OfficeContext> {
  const user = await requireUser(["office", "admin"]);
  if (user.role === "admin") {
    const visit = Number((await cookies()).get(OFFICE_VISIT_COOKIE)?.value);
    if (!visit) redirect("/admin/offices");
    const [office] = await requireDb()
      .select({ id: offices.id, name: offices.name })
      .from(offices)
      .where(eq(offices.id, visit));
    if (!office) redirect("/admin/offices");
    return { ...user, officeId: office.id, officeName: office.name, visiting: true };
  }
  if (!user.officeId) throw new Error("Compte Office sans Office de rattachement.");
  return { ...user, officeId: user.officeId, visiting: false };
}

/** Actions d'écriture de l'Office : réservées à ses agents (l'Admin en visite ne modifie rien). */
export async function requireOfficeAgent(): Promise<OfficeContext> {
  const user = await requireUser(["office"]);
  if (!user.officeId) throw new Error("Compte Office sans Office de rattachement.");
  return { ...user, officeId: user.officeId, visiting: false };
}

/** Espace école : compte rattaché à un établissement. */
export async function requireSchool() {
  const user = await requireUser(["school"]);
  if (!user.schoolId || !user.officeId) throw new Error("Compte école sans établissement.");
  return { ...user, schoolId: user.schoolId, officeId: user.officeId };
}

/** Fiche candidat de l'utilisateur connecté. */
export const requireCandidate = cache(async () => {
  const user = await requireUser(["candidate"]);
  const [candidate] = await requireDb()
    .select()
    .from(candidates)
    .where(eq(candidates.userId, user.id))
    .limit(1);
  if (!candidate) redirect("/connexion");
  return { user, candidate };
});
