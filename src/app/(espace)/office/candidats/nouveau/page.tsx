import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/app/ui";
import { requireOffice } from "@/lib/auth";
import { createCandidate } from "../actions";
import { CandidateForm } from "../CandidateForm";

export const metadata: Metadata = { title: "Enregistrer un candidat" };

export default async function NouveauCandidatPage() {
  await requireOffice();
  return (
    <>
      <PageHeader
        back={{ href: "/office/candidats", label: "Candidats" }}
        title="Enregistrer un candidat"
        description="Saisissez les informations du dossier validé. La convocation est générée dès l'enregistrement."
      />
      <Card>
        <CandidateForm action={createCandidate} submitLabel="Enregistrer et générer la convocation" />
      </Card>
    </>
  );
}
