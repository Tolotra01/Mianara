import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/app/ui";
import { and, asc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { schools } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { serieOptions } from "@/lib/candidate-input";
import { createCandidate } from "../actions";
import { CandidateForm } from "../CandidateForm";

export const metadata: Metadata = { title: "Enregistrer un candidat" };

export default async function NouveauCandidatPage() {
  const user = await requireOffice();
  const db = requireDb();
  const [series, schoolList] = await Promise.all([
    serieOptions(db),
    db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(and(eq(schools.officeId, user.officeId), eq(schools.isActive, true)))
      .orderBy(asc(schools.name)),
  ]);
  return (
    <>
      <PageHeader
        back={{ href: "/office/candidats", label: "Candidats" }}
        title="Enregistrer un candidat"
        description="Saisissez les informations du dossier validé. La convocation est générée dès l'enregistrement."
      />
      <Card>
        <CandidateForm
          action={createCandidate}
          series={series}
          schools={schoolList}
          submitLabel="Enregistrer et générer la convocation"
        />
      </Card>
    </>
  );
}
