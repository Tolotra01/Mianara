"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { subjects } from "@/db/schema";
import { courses, teacherSubjects, teachers, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { hashPassword, requireUser } from "@/lib/auth";
import { temporaryPassword } from "@/lib/crypto";
import { phoneField } from "@/lib/phone";

const Teacher = z.object({
  fullName: z.string().trim().min(3, "Nom complet obligatoire.").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{4,40}$/, "4 à 40 caractères : lettres, chiffres, point, tiret."),
  email: z.string().trim().email("Email invalide.").max(120).optional().or(z.literal("")),
  phone: phoneField(),
  city: z.string().trim().max(80).optional(),
  yearsExperience: z.coerce
    .number()
    .int()
    .min(0, "Durée invalide.")
    .max(60, "Durée invalide.")
    .default(0),
  bio: z.string().trim().max(1000).optional(),
});

/** Fiche d'un enseignant libre, résolue depuis son compte. */
async function findTeacher(userId: string) {
  const [row] = await requireDb()
    .select({
      teacherId: teachers.id,
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      city: teachers.city,
      bio: teachers.bio,
      yearsExperience: teachers.yearsExperience,
    })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

/** Compte enseignant libre créé par l'Administration (sans rattachement). */
export async function createTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const parsed = Teacher.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const d = parsed.data;
  const subjectIds = form
    .getAll("subjectIds")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!subjectIds.length) {
    return fail("Sélectionnez au moins une matière.", { subjectIds: "Matière obligatoire." });
  }

  const db = requireDb();
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${d.username}`);
  if (taken) return fail("Identifiant déjà utilisé.", { username: "Identifiant déjà utilisé." });
  const knownSubjects = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(inArray(subjects.id, subjectIds));
  if (knownSubjects.length !== subjectIds.length) return fail("Matière inconnue.");

  const password = temporaryPassword();
  const [account] = await requireTxDb()
    .transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          role: "teacher",
          username: d.username,
          fullName: d.fullName,
          email: d.email || null,
          phone: d.phone || null,
          // Enseignant libre : aucun rattachement à un établissement ni à un Office.
          officeId: null,
          schoolId: null,
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
        })
        .returning({ id: users.id });
      const [teacher] = await tx
        .insert(teachers)
        .values({
          userId: created.id,
          city: d.city || null,
          bio: d.bio || null,
          yearsExperience: d.yearsExperience,
          createdBy: admin.id,
        })
        .returning({ id: teachers.id });
      await tx.insert(teacherSubjects).values(subjectIds.map((subjectId) => ({ teacherId: teacher.id, subjectId })));
      await audit(
        {
          actorId: admin.id,
          action: "enseignant.creer",
          table: "teachers",
          recordId: teacher.id,
          newData: { ...d, subjectIds },
        },
        tx,
      );
      return [{ id: created.id, username: d.username }];
    });

  refresh();
  return ok(`Compte enseignant ${account.username} créé.`, { secret: password });
}

/** Fiche d'un enseignant libre modifiée par l'Administration (matières, ville, activité). */
const Profile = z.object({
  city: z.string().trim().max(80, "Ville trop longue.").optional(),
  phone: phoneField(),
  bio: z.string().trim().max(1000, "Présentation trop longue.").optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  subjectIds: z.array(z.number().int().positive()).min(1, "Sélectionnez au moins une matière."),
});

export async function updateTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const userId = String(form.get("id") ?? "");
  const teacher = await findTeacher(userId);
  if (!teacher) return fail("Enseignant introuvable.");
  const parsed = Profile.safeParse({
    city: form.get("city"),
    phone: form.get("phone"),
    bio: form.get("bio"),
    yearsExperience: form.get("yearsExperience"),
    subjectIds: form.getAll("subjectIds").map(Number),
  });
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const d = parsed.data;
  const db = requireDb();
  const knownSubjects = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(inArray(subjects.id, d.subjectIds));
  if (knownSubjects.length !== d.subjectIds.length) return fail("Matière inconnue.");

  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(teachers)
      .set({ city: d.city || null, bio: d.bio || null, yearsExperience: d.yearsExperience, updatedAt: new Date() })
      .where(eq(teachers.id, teacher.teacherId));
    await tx.update(users).set({ phone: d.phone || null }).where(eq(users.id, teacher.userId));
    await tx.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, teacher.teacherId));
    await tx
      .insert(teacherSubjects)
      .values(d.subjectIds.map((subjectId) => ({ teacherId: teacher.teacherId, subjectId })));
    await audit(
      {
        actorId: admin.id,
        action: "enseignant.modifier",
        table: "teachers",
        recordId: teacher.teacherId,
        newData: d,
      },
      tx,
    );
  });  refresh();
  return ok("Fiche enseignant mise à jour.");
}

/** Désactive le compte : l'enseignant perd l'accès, ses cours sont clos. */
export async function toggleTeacher(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireUser(["admin"]);
  const userId = String(form.get("id") ?? "");
  const teacher = await findTeacher(userId);
  if (!teacher) return fail("Enseignant introuvable.");
  const nextActive = !teacher.isActive;
  await requireTxDb().transaction(async (tx) => {
    await tx.update(users).set({ isActive: nextActive }).where(eq(users.id, teacher.userId));
    if (!nextActive) {
      await tx
        .update(courses)
        .set({ status: "closed", updatedAt: new Date() })
        .where(and(eq(courses.teacherId, teacher.teacherId), eq(courses.status, "open")));
    }
    await audit(
      {
        actorId: admin.id,
        action: "enseignant.modifier",
        table: "users",
        recordId: teacher.userId,
        newData: { isActive: nextActive },
      },
      tx,
    );
  });
  refresh();
  return ok(nextActive ? "Compte enseignant réactivé." : "Compte enseignant désactivé, cours clos.");
}
