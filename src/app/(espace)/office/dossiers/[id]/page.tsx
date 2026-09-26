import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Check, CircleCheck, RotateCcw, X, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Alert, Card, KeyValues, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { series } from "@/db/schema";
import { applications, candidates, schools, users } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/bac-rules";
import { APPLICATION_STATUS } from "@/lib/services/applications";
import { PIECES } from "@/lib/pieces";
import { reviewApplication, validateApplications } from "../actions";

export const metadata: Metadata = { title: "Dossier" };

export default async function DossierOfficePage({ params }: PageProps<"/office/dossiers/[id]">) {
  const user = await requireOffice();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row] = await requireDb()
    .select({
      a: applications,
      school: schools,
      serie: series.name,
      matricule: candidates.matricule,
      reviewer: users.fullName,
    })
    .from(applications)
    .innerJoin(schools, eq(schools.id, applications.schoolId))
    .innerJoin(series, eq(series.code, applications.serieCode))
    .leftJoin(candidates, eq(candidates.id, applications.candidateId))
    .leftJoin(users, eq(users.id, applications.reviewedBy))
    .where(and(eq(applications.id, id), eq(schools.officeId, user.officeId)));
  if (!row) notFound();
  const { a, school } = row;
  const missing = PIECES.filter((p) => !a.pieces.includes(p));
  const st = APPLICATION_STATUS[a.status];

  return (
    <>
      <PageHeader
        back={{ href: "/office/dossiers", label: "Dossiers des écoles" }}
        eyebrow={school.name}
        title={`${a.lastName} ${a.firstName}`}
        actions={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
      />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title="Dossier">
          <div className="grid gap-6 md:grid-cols-[180px_1fr]">
            {a.photoMime ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/dossiers/${a.id}/photo`}
                alt="Photo d'identité"
                className="aspect-[3/4] w-full max-w-44 rounded-xl object-cover"
              />
            ) : (
              <div className="grid aspect-[3/4] w-full max-w-44 place-items-center rounded-xl bg-danger-soft text-sm font-bold text-danger">
                Sans photo
              </div>
            )}
            <KeyValues
              items={[
                { label: "Nom", value: a.lastName },
                { label: "Prénoms", value: a.firstName },
                { label: "Né(e) le", value: `${formatDate(a.birthDate)} à ${a.birthPlace}` },
                { label: "Sexe", value: a.gender === "F" ? "Féminin" : "Masculin" },
                { label: "Adresse", value: a.address },
                { label: "Série", value: `${a.serieCode} · ${row.serie}` },
                { label: "CIN", value: a.cin, mono: true },
                { label: "Téléphone", value: a.phone },
                { label: "Envoyé le", value: a.submittedAt ? formatDateTime(a.submittedAt) : "—" },
                { label: "École", value: `${school.name} (${school.commune})` },
              ]}
            />
          </div>
          <h3 className="t-overline mt-6 text-muted">Pièces vérifiées par l&apos;école</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {PIECES.map((p) => {
              const ok = a.pieces.includes(p);
              return (
                <li
                  key={p}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${ok ? "bg-vert-soft" : "bg-danger-soft text-danger"}`}
                >
                  {ok ? <Check className="size-4 text-vert" /> : <X className="size-4" />} {p}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          {a.status === "submitted" ? (
            <Card title="Décision de l'Office">
              {missing.length > 0 && (
                <div className="mb-4">
                  <Alert tone="warning" title={`${missing.length} pièce(s) non cochée(s) par l'école`}>
                    {missing.join(", ")}.
                  </Alert>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <ConfirmAction
                  action={validateApplications}
                  fields={{ ids: a.id }}
                  icon={<CircleCheck className="size-5" />}
                  label="Valider et convoquer"
                  title="Valider ce dossier ?"
                  description="Le candidat est enregistré : matricule, identifiants, QR signé et convocation sont générés."
                  confirmLabel="Valider"
                />
                <ConfirmAction
                  action={reviewApplication}
                  fields={{ id: a.id, status: "incomplete" }}
                  variant="secondary"
                  icon={<RotateCcw className="size-5" />}
                  label="Renvoyer (incomplet)"
                  title="Renvoyer le dossier à l'école ?"
                  description="L'école corrige le dossier puis le renvoie."
                  confirmLabel="Renvoyer"
                >
                  <label className="block">
                    <span className="text-sm font-semibold">Ce qui manque ou est à corriger</span>
                    <textarea
                      name="note"
                      required
                      rows={3}
                      className="field-input mt-1.5"
                      placeholder="Acte de naissance illisible, photo non conforme…"
                    />
                  </label>
                </ConfirmAction>
                <ConfirmAction
                  action={reviewApplication}
                  fields={{ id: a.id, status: "rejected" }}
                  variant="danger"
                  icon={<XCircle className="size-5" />}
                  label="Refuser"
                  title="Refuser ce dossier ?"
                  description="Décision définitive pour cette session. L'école est prévenue du motif."
                  confirmLabel="Refuser"
                >
                  <label className="block">
                    <span className="text-sm font-semibold">Motif du refus</span>
                    <textarea
                      name="note"
                      required
                      rows={3}
                      className="field-input mt-1.5"
                      placeholder="Candidat ne remplissant pas les conditions…"
                    />
                  </label>
                </ConfirmAction>
              </div>
            </Card>
          ) : (
            <Card title="Décision">
              <p className="font-semibold">{st.label}</p>
              {a.reviewedAt && (
                <p className="text-sm text-muted">
                  {row.reviewer} · {formatDateTime(a.reviewedAt)}
                </p>
              )}
              {a.reviewNote && <p className="mt-3 rounded-xl bg-sunken p-3 text-sm">{a.reviewNote}</p>}
              {a.status === "validated" && a.candidateId && (
                <Link
                  href={`/office/candidats/${a.candidateId}`}
                  className="mt-3 inline-block font-semibold text-vert hover:underline"
                >
                  Fiche du candidat · <Mono>{row.matricule}</Mono>
                </Link>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
