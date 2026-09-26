import type { Metadata } from "next";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { FileStack } from "lucide-react";
import Link from "next/link";
import { FilterTabs } from "@/components/app/Pagination";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidates, documentRequests, payments } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { DOC_LABEL, PAYMENT_METHOD, REQUEST_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Demandes" };

const STATUSES = ["pending", "validated", "pickup_scheduled", "delivered", "rejected"] as const;

export default async function DemandesPage({ searchParams }: PageProps<"/office/demandes">) {
  const user = await requireOffice();
  const params = await searchParams;
  const status =
    typeof params.statut === "string" && (STATUSES as readonly string[]).includes(params.statut)
      ? params.statut
      : "";
  const type =
    typeof params.type === "string" && ["transcript", "diploma"].includes(params.type) ? params.type : "";
  const db = requireDb();

  const filters: SQL[] = [eq(candidates.officeId, user.officeId)];
  if (status) filters.push(eq(documentRequests.status, status as (typeof STATUSES)[number]));
  if (type) filters.push(eq(documentRequests.type, type as "transcript" | "diploma"));

  const [rows, counts] = await Promise.all([
    db
      .select({ r: documentRequests, c: candidates, p: payments })
      .from(documentRequests)
      .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
      .leftJoin(payments, eq(payments.requestId, documentRequests.id))
      .where(and(...filters))
      .orderBy(desc(documentRequests.updatedAt))
      .limit(100),
    db
      .select({ status: documentRequests.status, n: count() })
      .from(documentRequests)
      .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
      .where(eq(candidates.officeId, user.officeId))
      .groupBy(documentRequests.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Demandes de relevé et de diplôme"
        description="Vérifiez le paiement, fixez la date de retrait, puis confirmez la remise au guichet."
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="statut"
            active={status}
            params={params}
            basePath="/office/demandes"
            options={[
              { value: "", label: "Toutes", count: counts.reduce((s, c) => s + c.n, 0) },
              ...STATUSES.map((s) => ({ value: s, label: REQUEST_STATUS[s].label, count: n(s) })),
            ]}
          />
          <FilterTabs
            param="type"
            active={type}
            params={params}
            basePath="/office/demandes"
            options={[
              { value: "", label: "Tous" },
              { value: "transcript", label: "Relevés" },
              { value: "diploma", label: "Diplômes" },
            ]}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="Aucune demande"
            description="Les demandes des candidats admis apparaîtront ici."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Demande</th>
                <th>Candidat</th>
                <th>Paiement</th>
                <th>Statut</th>
                <th>Mise à jour</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {rows.map(({ r, c, p }, i) => (
                <tr key={r.id} style={{ "--i": i } as React.CSSProperties}>
                  <td>
                    <Link href={`/office/demandes/${r.id}`} className="font-bold hover:text-vert">
                      {DOC_LABEL[r.type]}
                    </Link>
                    <div className="text-xs">
                      <Mono>{r.number}</Mono>
                    </div>
                  </td>
                  <td>
                    <span className="font-semibold">
                      {c.lastName} {c.firstName}
                    </span>
                    <div className="text-xs">
                      <Mono>{c.matricule}</Mono>
                    </div>
                  </td>
                  <td>{p ? `${PAYMENT_METHOD[p.method]} · ${formatAriary(p.amount)}` : "—"}</td>
                  <td>
                    <StatusBadge tone={REQUEST_STATUS[r.status].tone}>
                      {REQUEST_STATUS[r.status].label}
                    </StatusBadge>
                  </td>
                  <td className="whitespace-nowrap text-muted">{formatDateTime(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
