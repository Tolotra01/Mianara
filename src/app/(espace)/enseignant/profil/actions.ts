"use server";

import { eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { subjects } from "@/db/schema";
import { teacherSubjects, teachers, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireTeacher } from "@/lib/auth";
import { phoneField } from "@/lib/phone";

const Profile = z.object({
  city: z.string().trim().max(80, "Ville trop longue.").optional(),
  phone: phoneField(),
  bio: z.string().trim().max(1000, "Présentation trop longue.").optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  subjectIds: z.array(z.number().int().positive()).min(1, "Sélectionnez au moins une matière."),
});

/** L'enseignant fait vivre sa fiche publique : présentation et matières déclarées. */
export async function saveTeacherProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, teacher } = await requireTeacher();
  const parsed = Profile.safeParse({
    city: form.get("city"),
    phone: form.get("phone"),
    bio: form.get("bio"),
    yearsExperience: form.get("yearsExperience"),
    subjectIds: form.getAll("subjectIds").map(Number),
  });
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const d = parsed.data;
  const known = await requireDb()
    .select({ id: subjects.id })
    .from(subjects)
    .where(inArray(subjects.id, d.subjectIds));
  if (known.length !== d.subjectIds.length) return fail("Matière inconnue.");

  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(teachers)
      .set({
        city: d.city || null,
        bio: d.bio || null,
        yearsExperience: d.yearsExperience,
        updatedAt: new Date(),
      })
      .where(eq(teachers.id, teacher.id));
    await tx.update(users).set({ phone: d.phone || null }).where(eq(users.id, user.id));
    await tx.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, teacher.id));
    await tx
      .insert(teacherSubjects)
      .values(d.subjectIds.map((subjectId) => ({ teacherId: teacher.id, subjectId })));
    await audit(
      {
        actorId: user.id,
        action: "enseignant.profil",
        table: "teachers",
        recordId: teacher.id,
        newData: d,
      },
      tx,
    );
  });
  refresh();
  return ok("Profil enregistré.");
}
