"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { courseEnrollments, courses, teachers, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireCandidate } from "@/lib/auth";

const Reservation = z.object({
  courseId: z.coerce.number().int().positive(),
  message: z.string().trim().max(500).optional(),
});

/** Un candidat réserve un cours ouvert, dans la limite des places et de sa série. */
export async function reserveCourse(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, candidate } = await requireCandidate();
  const parsed = Reservation.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const { courseId, message } = parsed.data;
  const db = requireDb();
  const [row] = await db
    .select({
      id: courses.id,
      status: courses.status,
      serieCode: courses.serieCode,
      capacity: courses.capacity,
      teacherName: users.fullName,
      teacherActive: users.isActive,
    })
    .from(courses)
    .innerJoin(teachers, eq(teachers.id, courses.teacherId))
    .innerJoin(users, eq(users.id, teachers.userId))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!row || !row.teacherActive) return fail("Ce cours n'est plus disponible.");
  if (row.serieCode && row.serieCode !== candidate.serieCode)
    return fail(`Ce cours vise la série ${row.serieCode}, la vôtre est ${candidate.serieCode}.`);

  // Le contrôle des places et l'écriture doivent être indissociables : le verrou
  // sur le cours sérialise les réservations concurrentes et écarte le dépassement
  // qu'un simple comptage avant insertion laisserait passer.
  const outcome = await requireTxDb().transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: courses.status, capacity: courses.capacity })
      .from(courses)
      .where(eq(courses.id, courseId))
      .for("update");
    if (!locked) return { error: "Ce cours n'est plus disponible." };
    if (locked.status !== "open") return { error: "Ce cours n'est plus ouvert aux réservations." };

    if (locked.capacity !== null) {
      const [taken] = await tx
        .select({ taken: count() })
        .from(courseEnrollments)
        .where(
          and(eq(courseEnrollments.courseId, courseId), inArray(courseEnrollments.status, ["pending", "confirmed"])),
        );
      if ((taken?.taken ?? 0) >= locked.capacity) return { error: "Ce cours est complet." };
    }

    // La contrainte unique (cours, candidat) interdit une seconde ligne : une
    // réservation annulée se réactive donc au lieu d'être recréée.
    const [existing] = await tx
      .select({ id: courseEnrollments.id, status: courseEnrollments.status })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.candidateId, candidate.id)))
      .limit(1);
    if (existing && existing.status !== "cancelled") return { error: "Vous avez déjà réservé ce cours." };

    const [written] = existing
      ? await tx
          .update(courseEnrollments)
          .set({ status: "pending", message: message || null, updatedAt: new Date() })
          .where(eq(courseEnrollments.id, existing.id))
          .returning({ id: courseEnrollments.id })
      : await tx
          .insert(courseEnrollments)
          .values({ courseId, candidateId: candidate.id, status: "pending", message: message || null })
          .returning({ id: courseEnrollments.id });

    await audit(
      {
        actorId: user.id,
        action: "cours.reserver",
        table: "course_enrollments",
        recordId: String(written.id),
        newData: { courseId, status: "pending" },
      },
      tx,
    );
    return { error: null as string | null };
  });

  if (outcome.error) return fail(outcome.error);
  refresh();
  return ok(`Réservation envoyée à ${row.teacherName} : il vous répondra dans son espace.`);
}

/** Le candidat annule sa propre réservation tant qu'elle n'est pas confirmée. */
export async function cancelReservation(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, candidate } = await requireCandidate();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [row] = await db
    .select({ status: courseEnrollments.status })
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.id, id), eq(courseEnrollments.candidateId, candidate.id)))
    .limit(1);
  if (!row) return fail("Réservation introuvable.");
  if (row.status === "confirmed") return fail("Réservation confirmée : demandez son annulation à l'enseignant.");
  if (row.status === "cancelled") return fail("Réservation déjà annulée.");
  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(courseEnrollments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(courseEnrollments.id, id));
    await audit(
      {
        actorId: user.id,
        action: "cours.annuler",
        table: "course_enrollments",
        recordId: String(id),
        newData: { status: "cancelled" },
      },
      tx,
    );
  });
  refresh();
  return ok("Réservation annulée.");
}
