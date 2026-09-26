import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Alert, Card, KeyValues, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidatePhotos, candidates, offices, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/bac-rules";
import { serieOptions } from "@/lib/candidate-input";
import { CANDIDATE_STATUS } from "@/lib/labels";
import { CandidateForm } from "../../../office/candidats/CandidateForm";
import { updateFreeCandidate } from "../actions";
import { FreeCandidateAccountActions } from "../AccountActions";

export const metadata: Metadata = { title: "Candidat libre" };

export default async function CandidatLibrePage({ params, searchParams }: PageProps<"/admin/candidats-libres/[id]">) {
  await requireUser(["admin"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = requireDb();
  const [row] = await db
    .select({ c: candidates, office: offices.name, account: users })
    .from(candidates)
    .innerJoin(offices, eq(offices.id, candidates.officeId))
    .leftJoin(users, eq(users.id, candidates.userId))
    .where(eq(candidates.id, id))
    .limit(1);
  if (!row || row.c.kind !== "libre") notFound();
  const { c, office, account } = row;

  const [series, officeList, [photo]] = await Promise.all([
    serieOptions(db),
    db.select({ id: offices.id, name: offices.name }).from(offices).orderBy(asc(offices.id)),
    db
      .select({ id: candidatePhotos.candidateId })
      .from(candidatePhotos)
      .where(eq(candidatePhotos.candidateId, id))
      .limit(1),
  ]);
  const status = CANDIDATE_STATUS[c.status];
  const active = Boolean(account?.isActive) && c.status !== "disabled";
  const name = `${c.firstName} ${c.lastName}`;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/candidats-libres", label: "Candidats libres" }}
        eyebrow={office}
        title={name}
        description={
          <>
            Matricule <span className="font-mono font-bold">{c.matricule}</span> · série {c.serieCode}
          </>
        }
        actions={
          <>
            <StatusBadge tone={active ? status.tone : "neutral"}>
              {active ? status.label : "Compte désactivé"}
            </StatusBadge>
            <a
              href={`/api/convocations/${c.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-raised px-3 text-sm font-semibold hover:border-vert hover:text-vert"
            >
              <FileText className="size-4" /> Convocation
            </a>
            <FreeCandidateAccountActions id={c.id} name={name} active={active} />
          </>
        }
      />

      {query.nouveau && (
        <div className="mb-6">
          <Alert tone="success">
            Candidat enregistré. Imprimez la convocation : elle porte ses identifiants de première connexion.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card title="Dossier">
          <CandidateForm
            action={updateFreeCandidate}
            series={series}
            offices={officeList}
            mode="admin"
            values={{
              ...c,
              officeId: c.officeId,
              photoUrl: photo ? `/api/photos/${c.id}` : null,
            }}
            submitLabel="Enregistrer les modifications"
            hint="Le matricule et la série ne changent pas. Chaque modification est journalisée."
          />
        </Card>
        <Card title="Compte">
          <KeyValues
            items={[
              { label: "Identifiant", value: account?.username ?? "—", mono: true },
              {
                label: "Première connexion",
                value: account?.mustChangePassword ? "Pas encore (mot de passe temporaire)" : "Faite",
              },
              {
                label: "Dernière connexion",
                value: account?.lastLoginAt ? formatDate(account.lastLoginAt.toISOString().slice(0, 10)) : "—",
              },
              { label: "Enregistré le", value: formatDate(c.createdAt.toISOString().slice(0, 10)) },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
