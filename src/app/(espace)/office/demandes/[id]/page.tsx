import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { CalendarCheck, CircleCheck, FileDown, HandCoins, PackageCheck, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { RequestSteps } from "@/components/app/RequestSteps";
import {
  Alert,
  Avatar,
  buttonClass,
  Card,
  KeyValues,
  LinkButton,
  Mono,
  PageHeader,
  StatusBadge,
} from "@/components/app/ui";
import { requireDb } from "@/db";
import {
  blacklist,
  candidatePhotos,
  candidates,
  documentRequests,
  offices,
  payments,
  results,
  users,
} from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { DECISION_LABEL, formatAriary, formatDateTime, MENTION_LABEL, toLocalInput } from "@/lib/bac-rules";
import { DOC_LABEL, PAYMENT_METHOD, PAYMENT_STATUS, REQUEST_STATUS } from "@/lib/labels";
import { markDelivered, rejectRequest, schedulePickup, validateRequest } from "../actions";

export const metadata: Metadata = { title: "Demande" };

export default async function DemandePage({ params }: PageProps<"/office/demandes/[id]">) {
  const user = await requireOffice();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = requireDb();
  const [row] = await db
    .select({ r: documentRequests, c: candidates, p: payments, result: results, office: offices })
    .from(documentRequests)
    .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
    .innerJoin(offices, eq(offices.id, candidates.officeId))
    .leftJoin(payments, eq(payments.requestId, documentRequests.id))
    .leftJoin(results, eq(results.candidateId, candidates.id))
    .where(and(eq(documentRequests.id, id), eq(candidates.officeId, user.officeId)));
  if (!row) notFound();
  const { r, c, p, result, office } = row;

  const [[photo], [black], reviewer] = await Promise.all([
    db
      .select({ id: candidatePhotos.candidateId })
      .from(candidatePhotos)
      .where(eq(candidatePhotos.candidateId, c.id)),
    db
      .select()
      .from(blacklist)
      .where(and(eq(blacklist.candidateId, c.id), isNull(blacklist.liftedAt))),
    r.reviewedBy
      ? db.select({ name: users.fullName }).from(users).where(eq(users.id, r.reviewedBy))
      : Promise.resolve([]),
  ]);
  const receiptUrl = `/api/demandes/${r.id}/recu`;
  const isPdf = p?.receiptMime === "application/pdf";
  // Proposition par défaut : le lendemain de la validation, à 9 h (heure de Madagascar).
  const tomorrow = new Date(r.updatedAt.getTime() + 86400000);
  tomorrow.setUTCHours(6, 0, 0, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/office/demandes", label: "Demandes" }}
        eyebrow={DOC_LABEL[r.type]}
        title={<Mono>{r.number}</Mono>}
        actions={
          <>
            <StatusBadge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</StatusBadge>
            {p && (
              <LinkButton
                href={`/api/demandes/${r.id}/ticket`}
                target="_blank"
                variant="secondary"
                size="sm"
                prefetch={false}
              >
                <FileDown className="size-4" /> Ticket
              </LinkButton>
            )}
          </>
        }
      />

      <Card className="mb-6">
        <RequestSteps status={r.status} />
      </Card>

      {black && (
        <div className="mb-6">
          <Alert tone="danger" title="Candidat en liste noire">
            {black.reason}. La demande doit être rejetée (RG-13).
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card
            title="Reçu de paiement"
            description={p ? `${PAYMENT_METHOD[p.method]} · référence ${p.reference}` : undefined}
            padded={false}
          >
            {p ? (
              isPdf ? (
                <iframe src={receiptUrl} title="Reçu de paiement" className="h-[520px] w-full bg-sunken" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptUrl}
                  alt="Reçu de paiement déposé par le candidat"
                  className="max-h-[520px] w-full bg-sunken object-contain"
                />
              )
            ) : (
              <p className="p-5 text-muted">Aucun paiement.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Candidat">
            <div className="mb-4 flex items-center gap-3">
              <Avatar
                name={`${c.firstName} ${c.lastName}`}
                src={photo ? `/api/photos/${c.id}` : null}
                size={56}
              />
              <div>
                <p className="font-bold">
                  {c.lastName} {c.firstName}
                </p>
                <Mono>{c.matricule}</Mono>
              </div>
            </div>
            <KeyValues
              items={[
                { label: "Série", value: c.serieCode },
                {
                  label: "Résultat",
                  value: result
                    ? `${DECISION_LABEL[result.decision]}${result.mention ? ` · ${MENTION_LABEL[result.mention]}` : ""}`
                    : "—",
                },
                { label: "Montant", value: p ? formatAriary(p.amount) : "—" },
                {
                  label: "Paiement",
                  value: p ? (
                    <StatusBadge tone={PAYMENT_STATUS[p.status].tone}>
                      {PAYMENT_STATUS[p.status].label}
                    </StatusBadge>
                  ) : (
                    "—"
                  ),
                },
                { label: "Déposée le", value: formatDateTime(r.createdAt) },
                { label: "Traitée par", value: reviewer[0]?.name },
              ]}
            />
          </Card>

          {r.status === "pending" && (
            <Card
              title="1. Vérifier le paiement"
              description="Comparez la référence et le montant avec le relevé Mobile Money ou bancaire."
            >
              <div className="flex flex-wrap gap-2">
                <ConfirmAction
                  action={validateRequest}
                  fields={{ id: r.id }}
                  icon={<HandCoins className="size-5" />}
                  label="Paiement conforme"
                  title="Valider le paiement ?"
                  description={`${p ? formatAriary(p.amount) : ""} · ${p ? PAYMENT_METHOD[p.method] : ""} · référence ${p?.reference}`}
                  confirmLabel="Valider"
                />
                <RejectButton id={r.id} />
              </div>
            </Card>
          )}

          {(r.status === "validated" || r.status === "pickup_scheduled") && (
            <Card title={r.status === "validated" ? "2. Fixer le retrait" : "Retrait prévu"}>
              {r.pickupAt && (
                <p className="mb-4 flex items-center gap-2 font-semibold">
                  <CalendarCheck className="size-5 text-vert" /> {formatDateTime(r.pickupAt)} ·{" "}
                  {r.pickupPlace}
                </p>
              )}
              <ActionForm action={schedulePickup} className="space-y-3">
                <input type="hidden" name="id" value={r.id} />
                <label className="block">
                  <span className="text-sm font-semibold">Date et heure</span>
                  <input
                    type="datetime-local"
                    name="pickupAt"
                    required
                    defaultValue={toLocalInput(r.pickupAt ?? tomorrow)}
                    className="field-input mt-1.5"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">Lieu</span>
                  <input
                    name="pickupPlace"
                    required
                    defaultValue={
                      r.pickupPlace ?? `Guichet de l'${office.name}, ${office.address ?? office.city}`
                    }
                    className="field-input mt-1.5"
                  />
                </label>
                <SubmitButton className={buttonClass(r.status === "validated" ? "primary" : "secondary")}>
                  {r.status === "validated" ? "Fixer et prévenir le candidat" : "Modifier le rendez-vous"}
                </SubmitButton>
              </ActionForm>
              {r.status === "validated" && (
                <div className="mt-4 border-t border-line pt-4">
                  <RejectButton id={r.id} />
                </div>
              )}
            </Card>
          )}

          {r.status === "pickup_scheduled" && (
            <Card title="3. Remise au guichet">
              <ActionForm action={markDelivered} className="space-y-4">
                <input type="hidden" name="id" value={r.id} />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
                  <input type="checkbox" name="identity" className="mt-1 size-4 accent-[var(--vert)]" />
                  <span className="text-sm">
                    J&apos;ai vérifié l&apos;identité du candidat (pièce d&apos;identité et convocation) avant
                    de lui remettre le document.
                  </span>
                </label>
                <SubmitButton className={buttonClass("primary")}>
                  <PackageCheck className="size-5" /> Confirmer la remise
                </SubmitButton>
              </ActionForm>
            </Card>
          )}

          {r.status === "delivered" && (
            <Alert tone="success" title={`Remis le ${formatDateTime(r.deliveredAt!)}`}>
              <span className="inline-flex items-center gap-1">
                <CircleCheck className="size-4" /> Document retiré par le candidat.
              </span>
            </Alert>
          )}
          {r.status === "rejected" && (
            <Alert tone="danger" title="Demande rejetée">
              {r.rejectionReason}
            </Alert>
          )}
        </div>
      </div>
    </>
  );
}

function RejectButton({ id }: { id: string }) {
  return (
    <ConfirmAction
      action={rejectRequest}
      fields={{ id }}
      variant="danger"
      icon={<XCircle className="size-5" />}
      label="Rejeter"
      title="Rejeter la demande ?"
      description="Le candidat sera prévenu du motif et pourra déposer une nouvelle demande."
      confirmLabel="Rejeter"
    >
      <label className="block">
        <span className="text-sm font-semibold">Motif</span>
        <textarea
          name="reason"
          required
          rows={3}
          className="field-input mt-1.5"
          placeholder="Référence introuvable, montant incorrect, reçu illisible…"
        />
      </label>
    </ConfirmAction>
  );
}
