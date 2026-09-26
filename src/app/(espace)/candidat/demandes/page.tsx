import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { CalendarCheck, FileDown, FileText, GraduationCap, Lock } from "lucide-react";
import { RequestSteps } from "@/components/app/RequestSteps";
import { Alert, Card, LinkButton, Mono, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { documentRequests, payments } from "@/db/schema-gestion";
import { requireCandidate } from "@/lib/auth";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { PAYMENT_METHOD } from "@/lib/labels";
import { eligibility, feeFor, METHODS, type DocType } from "@/lib/services/requests";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "Relevé et diplôme" };

const DOCS: { type: DocType; title: string; icon: typeof FileText; text: string }[] = [
  {
    type: "transcript",
    title: "Relevé de notes",
    icon: FileText,
    text: "Paiement par Mobile Money (MVola, Orange Money, Airtel Money).",
  },
  {
    type: "diploma",
    title: "Diplôme",
    icon: GraduationCap,
    text: "Après le retrait du relevé. Paiement par Mobile Money ou virement bancaire.",
  },
];

export default async function DemandesPage() {
  const { candidate: c } = await requireCandidate();
  const db = requireDb();
  const rows = await db
    .select({ r: documentRequests, p: payments })
    .from(documentRequests)
    .leftJoin(payments, eq(payments.requestId, documentRequests.id))
    .where(eq(documentRequests.candidateId, c.id));

  const cards = await Promise.all(
    DOCS.map(async (d) => ({
      ...d,
      row: rows.find((x) => x.r.type === d.type),
      open: await eligibility(c.id, d.type, db),
      fee: await feeFor(c.id, d.type, db),
    })),
  );

  return (
    <>
      <PageHeader
        title="Relevé et diplôme"
        description="Les documents ne sont pas numériques : vous les retirez au guichet de l'Office du Bac, à la date fixée."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {cards.map(({ type, title, icon: Icon, text, row, open, fee }) => (
          <Card
            key={type}
            title={
              <span className="flex items-center gap-2">
                <Icon className="size-5 text-vert" /> {title}
              </span>
            }
            description={`${formatAriary(fee)} · ${text}`}
          >
            {row && row.r.status !== "rejected" ? (
              <div className="space-y-5">
                <RequestSteps status={row.r.status} />
                <div className="rounded-xl bg-sunken p-4 text-sm">
                  <p>
                    Demande <Mono>{row.r.number}</Mono>
                  </p>
                  {row.p && (
                    <p className="mt-1 text-muted">
                      {PAYMENT_METHOD[row.p.method]} · {formatAriary(row.p.amount)} · réf.{" "}
                      <Mono>{row.p.reference}</Mono>
                    </p>
                  )}
                </div>
                {row.r.status === "pickup_scheduled" && row.r.pickupAt && (
                  <Alert tone="success" title={`Retrait le ${formatDateTime(row.r.pickupAt)}`}>
                    <span className="inline-flex items-start gap-1">
                      <CalendarCheck className="mt-0.5 size-4 shrink-0" /> {row.r.pickupPlace}. Venez avec
                      votre convocation, une pièce d&apos;identité et votre ticket.
                    </span>
                  </Alert>
                )}
                {row.r.status === "delivered" && (
                  <Alert tone="success" title={`Retiré le ${formatDateTime(row.r.deliveredAt!)}`} />
                )}
                {row.p && (
                  <LinkButton
                    href={`/api/demandes/${row.r.id}/ticket`}
                    target="_blank"
                    variant="secondary"
                    size="sm"
                    prefetch={false}
                  >
                    <FileDown className="size-4" /> Ticket de paiement
                  </LinkButton>
                )}
              </div>
            ) : open.open ? (
              <div className="space-y-4">
                {row?.r.status === "rejected" && (
                  <Alert tone="danger" title="Demande précédente rejetée">
                    {row.r.rejectionReason}. Vous pouvez en déposer une nouvelle.
                  </Alert>
                )}
                <RequestForm type={type} methods={METHODS[type]} amount={formatAriary(fee)} />
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl bg-sunken p-4">
                <Lock className="mt-0.5 size-5 shrink-0 text-muted" />
                <p className="text-sm">
                  {open.reason}
                  {open.opensAt && (
                    <span className="block font-semibold">Ouverture le {formatDateTime(open.opensAt)}.</span>
                  )}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
