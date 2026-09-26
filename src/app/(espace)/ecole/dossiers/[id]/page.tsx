import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Check, Download, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Alert, Card, KeyValues, LinkButton, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { applications, candidates } from "@/db/schema-gestion";
import { requireSchool } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/bac-rules";
import { serieOptions } from "@/lib/candidate-input";
import { APPLICATION_STATUS } from "@/lib/services/applications";
import { CandidateForm } from "../../../office/candidats/CandidateForm";
import { PIECES } from "@/lib/pieces";
import { deleteApplication, saveApplication } from "../../actions";

export const metadata: Metadata = { title: "Dossier" };

const STEPS = ["Brouillon", "Envoyé", "Traité par l'Office"];

export default async function DossierPage({ params }: PageProps<"/ecole/dossiers/[id]">) {
  const user = await requireSchool();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = requireDb();
  const [row] = await db
    .select({ a: applications, matricule: candidates.matricule })
    .from(applications)
    .leftJoin(candidates, eq(candidates.id, applications.candidateId))
    .where(and(eq(applications.id, id), eq(applications.schoolId, user.schoolId)));
  if (!row) notFound();
  const { a, matricule } = row;
  const editable = a.status === "draft" || a.status === "incomplete";
  const st = APPLICATION_STATUS[a.status];
  const step = a.status === "draft" ? 0 : a.status === "submitted" ? 1 : 2;
  const series = editable ? await serieOptions(db) : [];
  // La photo n'est pas envoyée au navigateur avec le formulaire : l'aperçu passe par sa route.
  const { photo: _photo, ...formValues } = a;

  return (
    <>
      <PageHeader
        back={{ href: "/ecole/dossiers", label: "Dossiers" }}
        title={`${a.lastName} ${a.firstName}`}
        actions={
          <>
            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
            {a.status === "draft" && (
              <ConfirmAction
                action={deleteApplication}
                fields={{ id: a.id }}
                variant="ghost"
                size="sm"
                icon={<Trash2 className="size-4" />}
                label="Supprimer"
                title="Supprimer ce brouillon ?"
                confirmLabel="Supprimer"
              />
            )}
          </>
        }
      />

      <Card className="mb-6">
        <ol className="flex items-start">
          {STEPS.map((label, i) => (
            <li key={label} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span
                  className={`absolute top-4 right-1/2 h-0.5 w-full ${i <= step ? "bg-vert" : "bg-line"}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold ring-4 ring-raised ${
                  i < step || (i === step && a.status === "validated")
                    ? "bg-vert text-on-vert"
                    : i === step
                      ? "bg-soleil text-ink"
                      : "bg-sunken text-muted"
                }`}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="mt-2 text-xs font-semibold">{i === 2 && step === 2 ? st.label : label}</span>
            </li>
          ))}
        </ol>
      </Card>

      {a.status === "incomplete" && (
        <div className="mb-6">
          <Alert tone="warning" title={`Renvoyé par l'Office le ${formatDateTime(a.reviewedAt!)}`}>
            {a.reviewNote} Corrigez le dossier puis renvoyez-le depuis la liste des dossiers.
          </Alert>
        </div>
      )}
      {a.status === "rejected" && (
        <div className="mb-6">
          <Alert tone="danger" title="Dossier non validé par l'Office">
            {a.reviewNote}
          </Alert>
        </div>
      )}
      {a.status === "validated" && matricule && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-vert-soft p-5">
          <p>
            <span className="block font-bold">Candidat enregistré par l&apos;Office</span>
            Matricule <Mono>{matricule}</Mono>
          </p>
          <LinkButton href={`/api/convocations/${a.candidateId}?telecharger`} prefetch={false}>
            <Download className="size-5" /> Convocation
          </LinkButton>
        </div>
      )}

      <Card>
        {editable ? (
          <CandidateForm
            action={saveApplication}
            series={series}
            mode="school"
            lockSerie={false}
            values={{ ...formValues, photoUrl: a.photoMime ? `/api/dossiers/${a.id}/photo` : null }}
            submitLabel={a.status === "incomplete" ? "Enregistrer la correction" : "Enregistrer"}
            hint="Le dossier corrigé repasse en brouillon : renvoyez-le ensuite à l'Office."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            {a.photoMime ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/dossiers/${a.id}/photo`}
                alt=""
                className="aspect-[3/4] w-full max-w-48 rounded-xl object-cover"
              />
            ) : (
              <div className="aspect-[3/4] w-full max-w-48 rounded-xl bg-sunken" />
            )}
            <div className="space-y-6">
              <KeyValues
                items={[
                  { label: "Né(e) le", value: `${formatDate(a.birthDate)} à ${a.birthPlace}` },
                  { label: "Sexe", value: a.gender === "F" ? "Féminin" : "Masculin" },
                  { label: "Adresse", value: a.address },
                  { label: "Série", value: a.serieCode },
                  { label: "Téléphone", value: a.phone },
                  { label: "Envoyé le", value: a.submittedAt ? formatDateTime(a.submittedAt) : "—" },
                ]}
              />
              <ul className="grid gap-2 sm:grid-cols-2">
                {PIECES.map((p) => (
                  <li
                    key={p}
                    className={`flex items-center gap-2 text-sm ${a.pieces.includes(p) ? "" : "text-muted line-through"}`}
                  >
                    <Check className={`size-4 ${a.pieces.includes(p) ? "text-vert" : "text-line-strong"}`} />{" "}
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
