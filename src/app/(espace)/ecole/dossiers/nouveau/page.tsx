import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { requireSchool } from "@/lib/auth";
import { serieOptions } from "@/lib/candidate-input";
import { CandidateForm } from "../../../office/candidats/CandidateForm";
import { saveApplication } from "../../actions";

export const metadata: Metadata = { title: "Nouveau dossier" };

export default async function NouveauDossierPage() {
  await requireSchool();
  const series = await serieOptions(requireDb());
  return (
    <>
      <PageHeader
        back={{ href: "/ecole/dossiers", label: "Dossiers" }}
        title="Nouveau dossier"
        description="Recopiez la fiche d'inscription de l'élève et cochez les pièces fournies."
      />
      <Card>
        <CandidateForm
          action={saveApplication}
          series={series}
          mode="school"
          submitLabel="Enregistrer le brouillon"
          hint="Le dossier reste modifiable jusqu'à son envoi à l'Office."
        />
      </Card>
    </>
  );
}
