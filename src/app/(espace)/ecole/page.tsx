import type { Metadata } from "next";
import { and, count, desc, eq } from "drizzle-orm";
import { CircleCheck, FilePlus2, FolderOpen, Inbox, Send, TriangleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { Card, DataTable, LinkButton, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { applicationBatches, applications, users } from "@/db/schema-gestion";
import { requireSchool } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { SendButton } from "./SendButton";

export const metadata: Metadata = { title: "Espace établissement" };

export default async function EcoleHome() {
  const user = await requireSchool();
  const db = requireDb();
  const [counts, toFix, batches] = await Promise.all([
    db
      .select({ status: applications.status, n: count() })
      .from(applications)
      .where(eq(applications.schoolId, user.schoolId))
      .groupBy(applications.status),
    db
      .select()
      .from(applications)
      .where(and(eq(applications.schoolId, user.schoolId), eq(applications.status, "incomplete")))
      .orderBy(desc(applications.reviewedAt))
      .limit(6),
    db
      .select({ b: applicationBatches, by: users.fullName })
      .from(applicationBatches)
      .leftJoin(users, eq(users.id, applicationBatches.sentBy))
      .where(eq(applicationBatches.schoolId, user.schoolId))
      .orderBy(desc(applicationBatches.sentAt))
      .limit(8),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={user.officeName ?? "Office du Bacc"}
        title={user.schoolName ?? "Mon établissement"}
        description="Préparez les dossiers de vos élèves, envoyez-les à l'Office du Bacc et suivez leur validation."
        actions={
          <>
            <LinkButton href="/ecole/dossiers/nouveau" variant="secondary">
              <FilePlus2 className="size-5" /> Nouveau dossier
            </LinkButton>
            {n("draft") > 0 && <SendButton count={n("draft")} />}
          </>
        }
      />
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            l: "Brouillons",
            v: n("draft"),
            icon: FolderOpen,
            tone: "soleil",
            href: "/ecole/dossiers?statut=draft",
          },
          {
            l: "Envoyés à l'Office",
            v: n("submitted"),
            icon: Send,
            tone: "info",
            href: "/ecole/dossiers?statut=submitted",
          },
          {
            l: "À corriger",
            v: n("incomplete"),
            icon: TriangleAlert,
            tone: "mena",
            href: "/ecole/dossiers?statut=incomplete",
          },
          {
            l: "Non validés",
            v: n("rejected"),
            icon: XCircle,
            tone: "danger",
            href: "/ecole/dossiers?statut=rejected",
          },
          {
            l: "Validés · convoqués",
            v: n("validated"),
            icon: CircleCheck,
            tone: "brand",
            href: "/ecole/candidats",
          },
        ].map((s, i) => (
          <div key={s.l} style={{ "--i": i } as React.CSSProperties}>
            <StatCard label={s.l} value={s.v} icon={s.icon} tone={s.tone as "brand"} href={s.href} />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Dossiers à corriger" description="Renvoyés par l'Office avec leur motif.">
          {toFix.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <CircleCheck className="size-4 text-vert" /> Aucun dossier à corriger.
            </p>
          ) : (
            <ul className="space-y-3">
              {toFix.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/ecole/dossiers/${a.id}`}
                    className="block rounded-xl border border-soleil bg-soleil-soft p-3 transition-colors hover:border-vert"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold">
                        {a.lastName} {a.firstName}
                      </span>
                      <StatusBadge tone="warning">À corriger</StatusBadge>
                    </span>
                    <span className="mt-1 block text-sm">{a.reviewNote}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Historique des envois" padded={false}>
          {batches.length === 0 ? (
            <p className="flex items-center gap-2 p-5 text-sm text-muted">
              <Inbox className="size-4" /> Aucun envoi pour l&apos;instant.
            </p>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Dossiers</th>
                  <th>Envoyé par</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(({ b, by }) => (
                  <tr key={b.id}>
                    <td>{formatDateTime(b.sentAt)}</td>
                    <td className="font-bold tabular-nums">{b.count}</td>
                    <td className="text-muted">{by}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
