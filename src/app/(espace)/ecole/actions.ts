"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireDb } from "@/db";
import { applicationBatches, applications, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit, notifyMany } from "@/lib/audit";
import { requireSchool } from "@/lib/auth";
import { IdentityInput, serieExists } from "@/lib/candidate-input";
import { currentSession } from "@/lib/services/candidates";

const MAX_PHOTO = 2 * 1024 * 1024;

async function readPhoto(form: FormData) {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { photo: null };
  if (!["image/jpeg", "image/png"].includes(file.type)) return { error: "Photo : JPG ou PNG uniquement." };
  if (file.size > MAX_PHOTO) return { error: "Photo trop lourde (2 Mo maximum)." };
  return { photo: { mime: file.type, data: Buffer.from(await file.arrayBuffer()) } };
}

/**
 * ECO-01/02 : l'école prépare le dossier d'un élève. Un dossier incomplet corrigé
 * repasse en brouillon, prêt à être renvoyé à l'Office.
 */
export async function saveApplication(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireSchool();
  const parsed = IdentityInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez les champs signalés.", zodErrors(parsed.error.issues));
  const { photo, error } = await readPhoto(form);
  if (error) return fail(error, { photo: error });
  const db = requireDb();
  if (!(await serieExists(parsed.data.serieCode, db)))
    return fail("Série inconnue.", { serieCode: "Série inconnue." });
  const session = await currentSession(db);
  const pieces = form.getAll("pieces").map(String);
  const id = String(form.get("id") ?? "");
  const data = {
    ...parsed.data,
    lastName: parsed.data.lastName.toUpperCase(),
    pieces,
    updatedAt: new Date(),
  };
  const photoData = photo ? { photoMime: photo.mime, photo: photo.data } : {};

  if (id) {
    const [before] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.schoolId, user.schoolId)));
    if (!before) return fail("Dossier introuvable.");
    if (!["draft", "incomplete"].includes(before.status))
      return fail("Ce dossier est entre les mains de l'Office : il n'est plus modifiable.");
    await db
      .update(applications)
      .set({ ...data, ...photoData, status: "draft" })
      .where(eq(applications.id, id));
    await audit({
      actorId: user.id,
      action: "dossier.modifier",
      table: "applications",
      recordId: id,
      newData: data,
    });
    refresh();
    return ok(
      before.status === "incomplete" ? "Dossier corrigé : renvoyez-le à l'Office." : "Dossier enregistré.",
    );
  }

  const [created] = await db
    .insert(applications)
    .values({ ...data, ...photoData, schoolId: user.schoolId, sessionId: session.id })
    .returning({ id: applications.id });
  await audit({
    actorId: user.id,
    action: "dossier.creer",
    table: "applications",
    recordId: created.id,
    newData: data,
  });
  redirect(
    `/ecole/dossiers?ok=${encodeURIComponent(`Dossier de ${data.firstName} ${data.lastName} ajouté aux brouillons.`)}`,
  );
}

export async function deleteApplication(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireSchool();
  const id = String(form.get("id") ?? "");
  const db = requireDb();
  const deleted = await db
    .delete(applications)
    .where(
      and(
        eq(applications.id, id),
        eq(applications.schoolId, user.schoolId),
        eq(applications.status, "draft"),
      ),
    )
    .returning({ id: applications.id });
  if (!deleted.length) return fail("Seul un brouillon peut être supprimé.");
  await audit({ actorId: user.id, action: "dossier.supprimer", table: "applications", recordId: id });
  redirect(`/ecole/dossiers?ok=${encodeURIComponent("Brouillon supprimé.")}`);
}

/** ECO-03 : envoi de tous les brouillons à l'Office, en un lot tracé. */
export async function sendApplications(): Promise<ActionState> {
  const user = await requireSchool();
  const db = requireDb();
  const drafts = await db
    .select({ id: applications.id, photo: applications.photoMime, lastName: applications.lastName })
    .from(applications)
    .where(and(eq(applications.schoolId, user.schoolId), eq(applications.status, "draft")));
  if (!drafts.length) return fail("Aucun brouillon à envoyer.");
  const noPhoto = drafts.filter((d) => !d.photo);
  if (noPhoto.length)
    return fail(
      `Photo manquante pour ${noPhoto.length} dossier(s) : ${noPhoto
        .map((d) => d.lastName)
        .slice(0, 3)
        .join(", ")}…`,
    );

  const session = await currentSession(db);
  const now = new Date();
  await db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(applicationBatches)
      .values({ schoolId: user.schoolId, sessionId: session.id, count: drafts.length, sentBy: user.id })
      .returning({ id: applicationBatches.id });
    await tx
      .update(applications)
      .set({ status: "submitted", batchId: batch.id, submittedAt: now, updatedAt: now })
      .where(
        inArray(
          applications.id,
          drafts.map((d) => d.id),
        ),
      );
    await audit(
      {
        actorId: user.id,
        action: "dossiers.envoyer",
        table: "application_batches",
        recordId: batch.id,
        newData: { count: drafts.length },
      },
      tx,
    );
    const agents = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "office"), eq(users.officeId, user.officeId)));
    await notifyMany(
      agents.map((a) => a.id),
      {
        title: "Nouveaux dossiers reçus",
        body: `${user.schoolName} : ${drafts.length} dossier(s) à traiter.`,
        link: "/office/dossiers",
      },
      tx,
    );
  });
  refresh();
  return ok(`${drafts.length} dossier(s) envoyé(s) à l'Office du Bac.`);
}
