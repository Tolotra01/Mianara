import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Check, CreditCard, X } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { FilterTabs } from "@/components/app/Pagination";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { candidates, users } from "@/db/schema-gestion";
import { learningItems, learningPayments } from "@/db/schema-learning";
import { requireUser } from "@/lib/auth";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { KIND_LABEL, PAY_STATUS } from "@/lib/services/learning";
import { decidePayment } from "../actions";

export const metadata: Metadata = { title: "Paiements Orange Money" };

const STATUSES = ["pending", "approved", "rejected"] as const;

export default async function PaiementsPage({ searchParams }: PageProps<"/admin/apprentissage/paiements">) {
  await requireUser(["admin"]);
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.statut) ?? "pending";
  const rows = await requireDb()
    .select({
      p: learningPayments,
      title: learningItems.title,
      kind: learningItems.kind,
      subject: subjects.name,
      name: users.fullName,
      matricule: candidates.matricule,
      serie: candidates.serieCode,
    })
    .from(learningPayments)
    .innerJoin(learningItems, eq(learningItems.id, learningPayments.itemId))
    .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
    .innerJoin(users, eq(users.id, learningPayments.userId))
    .leftJoin(candidates, eq(candidates.userId, learningPayments.userId))
    .where(eq(learningPayments.status, status))
    .orderBy(status === "pending" ? learningPayments.createdAt : desc(learningPayments.reviewedAt))
    .limit(200);

  return (
    <>
      <PageHeader
        eyebrow="Apprentissage"
        title="Paiements Orange Money"
        description="Vérifiez chaque référence de transaction dans votre relevé Orange Money avant de la valider. La validation ouvre l'accès au contenu ou le chat de tutorat."
        back={{ href: "/admin/apprentissage", label: "Contenus" }}
      />
      <Card padded={false}>
        <div className="border-b border-line p-4">
          <FilterTabs
            param="statut"
            active={status === "pending" ? "" : status}
            params={params}
            basePath="/admin/apprentissage/paiements"
            options={[
              { value: "", label: "À vérifier" },
              { value: "approved", label: "Validés" },
              { value: "rejected", label: "Refusés" },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Aucun paiement"
            description="Les références envoyées depuis l'application s'affichent ici."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Date</th>
                <th>Candidat</th>
                <th>Contenu</th>
                <th>Montant</th>
                <th>Référence</th>
                <th>{status === "pending" ? "" : "Décision"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td className="whitespace-nowrap text-sm">{formatDateTime(r.p.createdAt)}</td>
                  <td>
                    <span className="font-bold">{r.name}</span>
                    <span className="block text-xs text-muted">
                      {r.matricule ? <Mono>{r.matricule}</Mono> : "—"} {r.serie ? `· série ${r.serie}` : ""}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold">{r.title}</span>
                    <span className="block text-xs text-muted">
                      {KIND_LABEL[r.kind]} · {r.subject}
                    </span>
                  </td>
                  <td className="tabular-nums font-bold">{formatAriary(r.p.amount)}</td>
                  <td>
                    <Mono>{r.p.reference}</Mono>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {status === "pending" ? (
                      <span className="inline-flex gap-1">
                        <ConfirmAction
                          action={decidePayment}
                          fields={{ id: r.p.id, decision: "approve" }}
                          size="sm"
                          icon={<Check className="size-4" />}
                          label="Valider"
                          title="Valider ce paiement ?"
                          description={`Confirmez avoir reçu ${formatAriary(r.p.amount)} avec la référence ${r.p.reference}.`}
                        />
                        <ConfirmAction
                          action={decidePayment}
                          fields={{ id: r.p.id, decision: "reject" }}
                          size="sm"
                          variant="danger"
                          icon={<X className="size-4" />}
                          label={<span className="sr-only">Refuser</span>}
                          title="Refuser ce paiement ?"
                          description="Le candidat est prévenu avec le motif."
                        >
                          <label className="block">
                            <span className="text-sm font-semibold">Motif</span>
                            <textarea
                              name="note"
                              required
                              rows={2}
                              defaultValue="Référence introuvable dans le relevé Orange Money."
                              className="field-input mt-1.5"
                            />
                          </label>
                        </ConfirmAction>
                      </span>
                    ) : (
                      <span className="text-sm">
                        <StatusBadge tone={PAY_STATUS[r.p.status].tone}>
                          {PAY_STATUS[r.p.status].label}
                        </StatusBadge>
                        {r.p.note && <span className="mt-1 block text-xs text-muted">{r.p.note}</span>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
