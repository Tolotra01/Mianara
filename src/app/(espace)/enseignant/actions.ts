"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { series } from "@/db/schema";
import { courseEnrollments, courses, teacherSubjects } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireTeacher } from "@/lib/auth";

/** Places proposées : vide = illimité. */
const capacityField = z
  .union([z.literal(""), z.coerce.number().int().min(1, "Places invalides.").max(500, "Maximum 500 places.")])
  .transform((v) => (v === "" ? null : v));

const Course = z.object({
  title: z.string().trim().min(3, "Titre obligatoire.").max(120),
  subjectId: z.coerce.number().int().positive("Matière obligatoire."),
  serieCode: z
    .string()
    .trim()
    .transform((v) => (v ? v : null)),
  description: z
    .string()
    .trim()
    .min(10, "Décrivez le cours (10 caractères minimum).")
    .max(4000, "Description trop longue."),
  format: z.enum(["presentiel", "en_ligne", "mixte"], { message: "Format invalide." }),
  priceAriary: z.coerce.number().int("Prix invalide.").min(0, "Prix invalide.").max(10_000_000, "Prix trop élevé."),
  capacity: capacityField,
});

/** Matière annoncée dans le profil de l'enseignant : un cours ne peut pas en sortir. */
async function subjectAllowed(teacherId: string, subjectId: number): Promise<string | null> {
  const [row] = await requireDb()
    .select({ id: teacherSubjects.subjectId })
    .from(teacherSubjects)
    .where(and(eq(teacherSubjects.teacherId, teacherId), eq(teacherSubjects.subjectId, subjectId)))
    .limit(1);
  return row ? null : "Matière non déclarée dans votre profil.";
}

async function serieExists(serieCode: string | null): Promise<string | null> {
  if (!serieCode) return null;
  const [row] = await requireDb()
    .select({ code: series.code })
    .from(series)
    .where(eq(series.code, serieCode))
    .limit(1);
  return row ? null : "Série inconnue.";
}

function courseData(d: z.infer<typeof Course>) {
  return {
    title: d.title,
    subjectId: d.subjectId,
    serieCode: d.serieCode,
    description: d.description,
    format: d.format,
    priceAriary: d.priceAriary,
    capacity: d.capacity,
  };
}

/** Réservations actives (en attente ou confirmées) sur un cours. */
async function takenSeats(courseId: number) {
  const [row] = await requireDb()
    .select({ taken: count() })
    .from(courseEnrollments)
    .where(
      and(eq(courseEnrollments.courseId, courseId), inArray(courseEnrollments.status, ["pending", "confirmed"])),
    );
  return row?.taken ?? 0;
}

/** Un enseignant crée son cours en brouillon : invisible des candidat·es. */
export async function createCourse(_: ActionState, form: FormData): Promise<ActionState> {
  const { teacher, user } = await requireTeacher();
  const parsed = Course.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const d = parsed.data;
  const subjectError = await subjectAllowed(teacher.id, d.subjectId);
  if (subjectError) return fail(subjectError, { subjectId: subjectError });
  const serieError = await serieExists(d.serieCode);
  if (serieError) return fail(serieError, { serieCode: serieError });

  const [created] = await requireDb()
    .insert(courses)
    .values({ ...courseData(d), teacherId: teacher.id, status: "draft" })
    .returning({ id: courses.id });
  await audit({
    actorId: user.id,
    action: "cours.creer",
    table: "courses",
    recordId: String(created.id),
    newData: courseData(d),
  });
  refresh();
  return ok("Cours enregistré en brouillon. Ouvrez-le pour recevoir des réservations.");
}

/** Modification d'un cours : le contenu reste hors ligne tant que le statut ne change pas. */
export async function updateCourse(_: ActionState, form: FormData): Promise<ActionState> {
  const { teacher, user } = await requireTeacher();
  const id = Number(form.get("id"));
  const parsed = Course.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const d = parsed.data;
  const db = requireDb();
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, teacher.id)))
    .limit(1);
  if (!course) return fail("Cours introuvable.");
  const subjectError = await subjectAllowed(teacher.id, d.subjectId);
  if (subjectError) return fail(subjectError, { subjectId: subjectError });
  const serieError = await serieExists(d.serieCode);
  if (serieError) return fail(serieError, { serieCode: serieError });

  const next = { ...courseData(d), updatedAt: new Date() };
  await requireTxDb().transaction(async (tx) => {
    await tx.update(courses).set(next).where(eq(courses.id, id));
    await audit(
      { actorId: user.id, action: "cours.modifier", table: "courses", recordId: String(id), newData: next },
      tx,
    );
  });
  refresh();
  return ok("Cours mis à jour.");
}

/** Ouvre les réservations. Un cours limité en places ne s'ouvre que s'il en reste. */
export async function publishCourse(_: ActionState, form: FormData): Promise<ActionState> {
  const { teacher, user } = await requireTeacher();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [course] = await db
    .select({ id: courses.id, status: courses.status, capacity: courses.capacity })
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, teacher.id)))
    .limit(1);
  if (!course) return fail("Cours introuvable.");
  if (course.status === "open") return fail("Ce cours est déjà ouvert.");
  if (course.capacity !== null && (await takenSeats(id)) >= course.capacity)
    return fail("Toutes les places de ce cours sont déjà réservées.");
  await requireTxDb().transaction(async (tx) => {
    await tx.update(courses).set({ status: "open", updatedAt: new Date() }).where(eq(courses.id, id));
    await audit(
      {
        actorId: user.id,
        action: "cours.publier",
        table: "courses",
        recordId: String(id),
        newData: { status: "open" },
      },
      tx,
    );
  });
  refresh();
  return ok("Cours ouvert : les candidat·es peuvent le réserver.");
}

/** Clôture : plus aucune nouvelle réservation. */
export async function closeCourse(_: ActionState, form: FormData): Promise<ActionState> {
  const { teacher, user } = await requireTeacher();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.teacherId, teacher.id)))
    .limit(1);
  if (!course) return fail("Cours introuvable.");
  await requireTxDb().transaction(async (tx) => {
    await tx.update(courses).set({ status: "closed", updatedAt: new Date() }).where(eq(courses.id, id));
    await audit(
      {
        actorId: user.id,
        action: "cours.clos",
        table: "courses",
        recordId: String(id),
        newData: { status: "closed" },
      },
      tx,
    );
  });
  refresh();
  return ok("Cours clos : il n'est plus proposé aux candidat·es.");
}

/** L'enseignant confirme ou refuse une réservation reçue sur l'un de ses cours. */
export async function decideEnrollment(_: ActionState, form: FormData): Promise<ActionState> {
  const { teacher, user } = await requireTeacher();
  const id = Number(form.get("id"));
  const confirm = form.get("decision") === "confirm";
  const db = requireDb();
  const [row] = await db
    .select({ id: courseEnrollments.id, status: courseEnrollments.status })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .where(and(eq(courseEnrollments.id, id), eq(courses.teacherId, teacher.id)))
    .limit(1);
  if (!row) return fail("Réservation introuvable.");
  if (row.status === "cancelled") return fail("Cette réservation est déjà annulée.");
  if (confirm && row.status === "confirmed") return fail("Réservation déjà confirmée.");

  const status = confirm ? "confirmed" : "cancelled";
  await requireTxDb().transaction(async (tx) => {
    await tx.update(courseEnrollments).set({ status, updatedAt: new Date() }).where(eq(courseEnrollments.id, id));
    await audit(
      {
        actorId: user.id,
        action: "cours.confirmer",
        table: "course_enrollments",
        recordId: String(id),
        newData: { status },
      },
      tx,
    );
  });
  refresh();
  return ok(confirm ? "Réservation confirmée." : "Réservation refusée.");
}
