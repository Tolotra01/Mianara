"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { requireDb, requireTxDb } from "@/db";
import { applications, schools } from "@/db/schema-gestion";
import { type ActionState, fail, ok } from "@/lib/action";
import { requireOfficeAgent } from "@/lib/auth";
import { notifyValidated, returnApplication, validateApplication } from "@/lib/services/applications";

/** Validation d'un ou plusieurs dossiers (cases cochées ou envoi entier). */
export async function validateApplications(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const ids = form.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return fail("Sélectionnez au moins un dossier.");
  const db = requireDb();
  const rows = await db
    .select({ id: applications.id, schoolId: applications.schoolId })
    .from(applications)
    .innerJoin(schools, eq(schools.id, applications.schoolId))
    .where(
      and(
        inArray(applications.id, ids),
        eq(schools.officeId, user.officeId),
        eq(applications.status, "submitted"),
      ),
    );
  if (!rows.length) return fail("Aucun dossier à valider dans la sélection.");

  const bySchool = new Map<number, number>();
  await requireTxDb().transaction(async (tx) => {
    for (const r of rows) {
      const res = await validateApplication(r.id, user.officeId, user.id, tx);
      if ("error" in res) throw new Error(res.error);
      bySchool.set(r.schoolId, (bySchool.get(r.schoolId) ?? 0) + 1);
    }
    for (const [schoolId, count] of bySchool) await notifyValidated(schoolId, count, tx);
  });
  refresh();
  return ok(`${rows.length} dossier(s) validé(s) : candidats enregistrés, convocations générées.`);
}

export async function reviewApplication(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireOfficeAgent();
  const id = String(form.get("id") ?? "");
  const status = form.get("status") === "rejected" ? "rejected" : "incomplete";
  const note = String(form.get("note") ?? "").trim();
  if (note.length < 5) return fail("Indiquez le motif pour l'école (5 caractères au moins).");
  const res = await requireTxDb().transaction((tx) =>
    returnApplication(id, status, note, user.officeId, user.id, tx),
  );
  if ("error" in res) return fail(res.error!);
  refresh();
  return ok(
    status === "incomplete"
      ? "Dossier renvoyé à l'école pour correction."
      : "Dossier refusé : l'école est prévenue.",
  );
}
