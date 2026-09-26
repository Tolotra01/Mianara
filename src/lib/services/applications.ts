import "server-only";
import { and, eq } from "drizzle-orm";
import { applications, schools, users } from "@/db/schema-gestion";
import { audit, type Executor, notifyMany } from "@/lib/audit";
import { registerCandidate } from "./candidates";

export const APPLICATION_STATUS = {
  draft: { label: "Brouillon", tone: "neutral" },
  submitted: { label: "Envoyé à l'Office", tone: "info" },
  incomplete: { label: "Incomplet : à corriger", tone: "warning" },
  rejected: { label: "Non validé", tone: "danger" },
  validated: { label: "Validé · convoqué", tone: "success" },
} as const;

async function schoolAccounts(schoolId: number, exec: Executor) {
  const rows = await exec
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "school")));
  return rows.map((r) => r.id);
}

/** Dossier envoyé par une école de l'Office, prêt à être traité. */
async function loadSubmitted(id: string, officeId: number, exec: Executor) {
  const [row] = await exec
    .select({ a: applications, school: schools })
    .from(applications)
    .innerJoin(schools, eq(schools.id, applications.schoolId))
    .where(and(eq(applications.id, id), eq(schools.officeId, officeId)));
  if (!row) return { error: "Dossier introuvable." } as const;
  if (row.a.status !== "submitted") return { error: "Ce dossier a déjà été traité." } as const;
  return row;
}

/**
 * Validation d'un dossier par l'Office : le candidat est enregistré (matricule,
 * compte, QR signé) et sa convocation devient disponible pour l'école et pour lui.
 */
export async function validateApplication(id: string, officeId: number, actorId: string, exec: Executor) {
  const row = await loadSubmitted(id, officeId, exec);
  if ("error" in row) return row;
  const { a, school } = row;
  const { candidate } = await registerCandidate(
    {
      officeId,
      lastName: a.lastName,
      firstName: a.firstName,
      birthDate: a.birthDate,
      birthPlace: a.birthPlace,
      gender: a.gender as "F" | "M",
      address: a.address,
      serieCode: a.serieCode,
      kind: "ecole",
      schoolId: school.id,
      schoolName: school.name,
      cin: a.cin,
      phone: a.phone,
      email: a.email,
      photo: a.photo && a.photoMime ? { mime: a.photoMime, data: a.photo } : null,
    },
    actorId,
    exec,
  );
  const now = new Date();
  await exec
    .update(applications)
    .set({
      status: "validated",
      candidateId: candidate.id,
      reviewedBy: actorId,
      reviewedAt: now,
      reviewNote: null,
      updatedAt: now,
    })
    .where(eq(applications.id, id));
  await audit(
    {
      actorId,
      action: "dossier.valider",
      table: "applications",
      recordId: id,
      newData: { candidateId: candidate.id },
    },
    exec,
  );
  return { candidate } as const;
}

/** Renvoi à l'école (incomplet, à corriger) ou refus définitif, avec le motif. */
export async function returnApplication(
  id: string,
  status: "incomplete" | "rejected",
  note: string,
  officeId: number,
  actorId: string,
  exec: Executor,
) {
  const row = await loadSubmitted(id, officeId, exec);
  if ("error" in row) return row;
  const now = new Date();
  await exec
    .update(applications)
    .set({ status, reviewNote: note, reviewedBy: actorId, reviewedAt: now, updatedAt: now })
    .where(eq(applications.id, id));
  await audit(
    {
      actorId,
      action: status === "incomplete" ? "dossier.renvoyer" : "dossier.refuser",
      table: "applications",
      recordId: id,
      newData: { note },
    },
    exec,
  );
  await notifyMany(
    await schoolAccounts(row.school.id, exec),
    {
      title: status === "incomplete" ? "Dossier incomplet renvoyé" : "Dossier non validé",
      body: `${row.a.lastName} ${row.a.firstName} : ${note}`,
      link: `/ecole/dossiers/${id}`,
    },
    exec,
  );
  return { ok: true } as const;
}

/** Prévient l'école des dossiers validés (un seul message par lot). */
export async function notifyValidated(schoolId: number, count: number, exec: Executor) {
  await notifyMany(
    await schoolAccounts(schoolId, exec),
    {
      title: "Dossiers validés",
      body: `${count} dossier(s) validé(s) par l'Office : les convocations sont disponibles.`,
      link: "/ecole/candidats",
    },
    exec,
  );
}
