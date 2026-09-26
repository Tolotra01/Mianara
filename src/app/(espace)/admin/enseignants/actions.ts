"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { authSessions, teacherProfiles, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { hashPassword, requireUser } from "@/lib/auth";
import { temporaryPassword } from "@/lib/crypto";

/**
 * Gestion des comptes enseignants par l'Administration : création (en plus de
 * l'inscription publique), correction, vérification, accès et mot de passe.
 * La validation des justificatifs et des offres reste sur « Offres et coaching ».
 */

const admin = () => requireUser(["admin"]);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const TeacherInput = z.object({
  fullName: z.string().trim().min(3, "Nom complet obligatoire.").max(100),
  subjectCode: z.string().trim().min(1, "Choisissez la matière.").max(30),
  phone: optional(20),
  email: z
    .union([z.literal(""), z.email("Email invalide.")])
    .optional()
    .transform((v) => v || null),
});

const Username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{4,40}$/, "4 à 40 caractères : lettres, chiffres, point, tiret.");

async function subjectExists(code: string) {
  const [s] = await requireDb().select({ code: subjects.code }).from(subjects).where(eq(subjects.code, code)).limit(1);
  return Boolean(s);
}

/** Compte enseignant existant. */
async function teacher(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await requireDb()
    .select({ user: users, profile: teacherProfiles })
    .from(users)
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(and(eq(users.id, id), eq(users.role, "teacher")))
    .limit(1);
  return row ?? null;
}

export async function createTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const parsed = TeacherInput.and(z.object({ username: Username })).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  if (!(await subjectExists(parsed.data.subjectCode)))
    return fail("Matière inconnue.", { subjectCode: "Matière inconnue." });
  const db = requireDb();
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${parsed.data.username}`);
  if (taken) return fail("Identifiant déjà utilisé.", { username: "Identifiant déjà utilisé." });

  // Créé par l'Administration : l'identité est vérifiée d'emblée.
  const verified = form.get("verified") === "on";
  const password = temporaryPassword();
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        role: "teacher",
        username: parsed.data.username,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      })
      .returning({ id: users.id });
    await tx.insert(teacherProfiles).values({
      userId: created.id,
      subjectCode: parsed.data.subjectCode,
      verificationStatus: verified ? "verified" : "pending",
      ...(verified ? { reviewedBy: user.id, reviewedAt: new Date() } : {}),
    });
    await audit(
      {
        actorId: user.id,
        action: "enseignant.creer",
        table: "users",
        recordId: created.id,
        newData: { ...parsed.data, verified },
      },
      tx,
    );
  });
  refresh();
  return ok(`Compte ${parsed.data.username} créé.`, { secret: password });
}

export async function updateTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const before = await teacher(String(form.get("id") ?? ""));
  if (!before) return fail("Enseignant introuvable.");
  const parsed = TeacherInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  if (!(await subjectExists(parsed.data.subjectCode)))
    return fail("Matière inconnue.", { subjectCode: "Matière inconnue." });
  const { subjectCode, ...identity } = parsed.data;
  await requireDb().transaction(async (tx) => {
    await tx.update(users).set(identity).where(eq(users.id, before.user.id));
    await tx.update(teacherProfiles).set({ subjectCode }).where(eq(teacherProfiles.userId, before.user.id));
    await audit(
      {
        actorId: user.id,
        action: "enseignant.modifier",
        table: "users",
        recordId: before.user.id,
        oldData: {
          fullName: before.user.fullName,
          phone: before.user.phone,
          email: before.user.email,
          subjectCode: before.profile.subjectCode,
        },
        newData: parsed.data,
      },
      tx,
    );
  });
  refresh();
  return ok("Enseignant mis à jour.");
}

const Verification = z.enum(["verified", "rejected", "pending"]);

/** Décision de l'Administration sur le profil (indépendamment des justificatifs déposés). */
export async function setTeacherVerification(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const before = await teacher(String(form.get("id") ?? ""));
  if (!before) return fail("Enseignant introuvable.");
  const status = Verification.safeParse(form.get("status"));
  if (!status.success) return fail("Décision invalide.");
  await requireDb()
    .update(teacherProfiles)
    .set({ verificationStatus: status.data, reviewedBy: user.id, reviewedAt: new Date() })
    .where(eq(teacherProfiles.userId, before.user.id));
  await audit({
    actorId: user.id,
    action: `enseignant.verification.${status.data}`,
    table: "teacher_profiles",
    recordId: before.user.id,
    oldData: { verificationStatus: before.profile.verificationStatus },
    newData: { verificationStatus: status.data },
  });
  refresh();
  return ok(
    status.data === "verified"
      ? "Enseignant vérifié : ses offres peuvent être publiées."
      : status.data === "rejected"
        ? "Profil refusé."
        : "Profil remis en attente de vérification.",
  );
}

/** Ferme ou rouvre l'accès ; la fermeture déconnecte aussi toutes ses sessions. */
export async function toggleTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const before = await teacher(String(form.get("id") ?? ""));
  if (!before) return fail("Enseignant introuvable.");
  const disable = before.user.isActive;
  await requireDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set(disable ? { isActive: false } : { isActive: true, lockedUntil: null, failedAttempts: 0 })
      .where(eq(users.id, before.user.id));
    if (disable) await tx.delete(authSessions).where(eq(authSessions.userId, before.user.id));
    await audit(
      {
        actorId: user.id,
        action: disable ? "enseignant.desactiver" : "enseignant.reactiver",
        table: "users",
        recordId: before.user.id,
      },
      tx,
    );
  });
  refresh();
  return ok(disable ? "Compte désactivé : l'enseignant est déconnecté." : "Compte réactivé.");
}

export async function resetTeacherPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await admin();
  const before = await teacher(String(form.get("id") ?? ""));
  if (!before) return fail("Enseignant introuvable.");
  const password = temporaryPassword();
  await requireDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: await hashPassword(password), mustChangePassword: true, failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, before.user.id));
    await tx.delete(authSessions).where(eq(authSessions.userId, before.user.id));
    await audit(
      { actorId: user.id, action: "enseignant.reinitialiser_mot_de_passe", table: "users", recordId: before.user.id },
      tx,
    );
  });
  refresh();
  return ok("Nouveau mot de passe temporaire généré.", { secret: password });
}
