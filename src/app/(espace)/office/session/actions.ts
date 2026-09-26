"use server";

import { and, count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { serieSubjects } from "@/db/schema";
import { candidates, exams, scans } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit, notifyMany } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/bac-rules";
import { currentSession } from "@/lib/services/candidates";

async function staff() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "office" && user.role !== "admin")) throw new Error("Accès refusé");
  return user;
}

const ExamInput = z
  .object({
    serieCode: z.string().trim().min(1).max(8),
    subjectId: z.coerce.number().int().positive("Choisissez la matière."),
    startsAt: z
      .string()
      .transform(
        (v, ctx) =>
          parseLocalDateTime(v) ??
          (ctx.addIssue({ code: "custom", message: "Date de début invalide." }), z.NEVER),
      ),
    endsAt: z
      .string()
      .transform(
        (v, ctx) =>
          parseLocalDateTime(v) ??
          (ctx.addIssue({ code: "custom", message: "Date de fin invalide." }), z.NEVER),
      ),
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "La fin doit suivre le début." })
  .refine((v) => v.endsAt.getTime() - v.startsAt.getTime() <= 6 * 3600e3, {
    path: ["endsAt"],
    message: "Une épreuve dure 6 h au plus.",
  });

/** OFF-04 : ajout ou modification d'une épreuve (impossible une fois l'emploi du temps publié). */
export async function saveExam(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await staff();
  const parsed = ExamInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const db = requireDb();
  const session = await currentSession(db);
  const id = Number(form.get("id")) || null;
  const { serieCode, subjectId, startsAt, endsAt } = parsed.data;

  const [inSerie] = await db
    .select()
    .from(serieSubjects)
    .where(and(eq(serieSubjects.serieCode, serieCode), eq(serieSubjects.subjectId, subjectId)));
  if (!inSerie) return fail("Cette matière n'existe pas dans cette série.");

  const sameSerie = await db
    .select()
    .from(exams)
    .where(and(eq(exams.sessionId, session.id), eq(exams.serieCode, serieCode)));
  if (sameSerie.some((e) => e.id !== id && e.subjectId === subjectId))
    return fail("Cette matière a déjà une épreuve.", { subjectId: "Déjà programmée." });
  const overlap = sameSerie.find((e) => e.id !== id && e.startsAt < endsAt && e.endsAt > startsAt);
  if (overlap)
    return fail("Chevauchement avec une autre épreuve de la série.", {
      startsAt: "Chevauche une autre épreuve.",
    });

  if (id) {
    const [before] = sameSerie.filter((e) => e.id === id);
    if (!before) return fail("Épreuve introuvable.");
    if (before.isPublished && user.role !== "admin")
      return fail("Emploi du temps publié : il est verrouillé.");
    await db.update(exams).set({ subjectId, startsAt, endsAt }).where(eq(exams.id, id));
    await audit({
      actorId: user.id,
      action: "epreuve.modifier",
      table: "exams",
      recordId: id,
      oldData: before,
      newData: { subjectId, startsAt, endsAt },
    });
  } else {
    const published = sameSerie.some((e) => e.isPublished);
    if (published && user.role !== "admin")
      return fail("Emploi du temps de cette série déjà publié : il est verrouillé.");
    const [exam] = await db
      .insert(exams)
      .values({ sessionId: session.id, serieCode, subjectId, startsAt, endsAt })
      .returning();
    await audit({
      actorId: user.id,
      action: "epreuve.creer",
      table: "exams",
      recordId: exam.id,
      newData: exam,
    });
  }
  refresh();
  return ok(id ? "Épreuve modifiée." : "Épreuve ajoutée.");
}

export async function deleteExam(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await staff();
  const id = Number(form.get("id"));
  const db = requireDb();
  const [exam] = await db.select().from(exams).where(eq(exams.id, id));
  if (!exam) return fail("Épreuve introuvable.");
  if (exam.isPublished && user.role !== "admin") return fail("Emploi du temps publié : il est verrouillé.");
  const [{ n }] = await db.select({ n: count() }).from(scans).where(eq(scans.examId, id));
  if (n) return fail("Des scans existent déjà pour cette épreuve.");
  await db.delete(exams).where(eq(exams.id, id));
  await audit({ actorId: user.id, action: "epreuve.supprimer", table: "exams", recordId: id, oldData: exam });
  refresh();
  return ok("Épreuve supprimée.");
}

/** Publication de l'emploi du temps d'une série : il devient visible et verrouillé (CAN-05). */
export async function publishTimetable(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await staff();
  const serieCode = String(form.get("serieCode"));
  const db = requireDb();
  const session = await currentSession(db);
  const updated = await db
    .update(exams)
    .set({ isPublished: true })
    .where(and(eq(exams.sessionId, session.id), eq(exams.serieCode, serieCode), eq(exams.isPublished, false)))
    .returning({ id: exams.id });
  if (!updated.length) return fail("Rien à publier pour cette série.");
  await audit({
    actorId: user.id,
    action: "edt.publier",
    table: "exams",
    newData: { serieCode, count: updated.length },
  });

  const recipients = await db
    .select({ userId: candidates.userId })
    .from(candidates)
    .where(and(eq(candidates.sessionId, session.id), eq(candidates.serieCode, serieCode)));
  await notifyMany(
    recipients.map((r) => r.userId),
    {
      title: "Emploi du temps publié",
      body: `L'emploi du temps officiel de la série ${serieCode} est disponible. Votre convocation est à jour.`,
      link: "/candidat/epreuves",
    },
  );
  refresh();
  return ok(`Emploi du temps de la série ${serieCode} publié (${updated.length} épreuves).`);
}
