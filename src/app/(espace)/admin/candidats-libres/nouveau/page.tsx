import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Card, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { offices } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { serieOptions } from "@/lib/candidate-input";
import { CandidateForm } from "../../../office/candidats/CandidateForm";
import { createFreeCandidate } from "../actions";

export const metadata: Metadata = { title: "Nouveau candidat libre" };

export default async function NouveauCandidatLibrePage() {
  await requireUser(["admin"]);
  const db = requireDb();
  const [series, officeList] = await Promise.all([
    serieOptions(db),
    db
      .select({ id: offices.id, name: offices.name })
      .from(offices)
      .where(eq(offices.isActive, true))
      .orderBy(asc(offices.id)),
  ]);
  return (
    <>
      <PageHeader
        back={{ href: "/admin/candidats-libres", label: "Candidats libres" }}
        title="Nouveau candidat libre"
        description="Pour une personne qui se présente sans établissement. Le matricule, le compte et la convocation sont générés à l'enregistrement."
      />
      <Card>
        <CandidateForm
          action={createFreeCandidate}
          series={series}
          offices={officeList}
          mode="admin"
          submitLabel="Enregistrer et générer la convocation"
        />
      </Card>
    </>
  );
}
