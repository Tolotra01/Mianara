import type { Metadata } from "next";
import { asc, count, eq, sql } from "drizzle-orm";
import { Building, FileStack, ShieldAlert, Users } from "lucide-react";
import { BarList, Ring, StackedBar } from "@/components/app/charts";
import { Alert, Card, DataTable, PageHeader, StatCard } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions, series } from "@/db/schema";
import { candidates, documentRequests, offices, results, scans } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";

export const metadata: Metadata = { title: "Pilotage national" };

export default async function AdminDashboard() {
  await requireUser(["admin"]);
  const db = requireDb();
  const [[session], byOffice, bySerie, decisions, [fraud], requests] = await Promise.all([
    db.select().from(examSessions).where(eq(examSessions.isCurrent, true)),
    db
      .select({
        id: offices.id,
        name: offices.city,
        active: offices.isActive,
        n: sql<number>`count(${candidates.id})::int`,
      })
      .from(offices)
      .leftJoin(candidates, eq(candidates.officeId, offices.id))
      .groupBy(offices.id)
      .orderBy(asc(offices.id)),
    db
      .select({
        code: series.code,
        total: sql<number>`count(${candidates.id})::int`,
        admitted: sql<number>`count(${results.candidateId}) filter (where ${results.decision} = 'admitted')::int`,
        deliberated: sql<number>`count(${results.candidateId})::int`,
      })
      .from(series)
      .leftJoin(candidates, eq(candidates.serieCode, series.code))
      .leftJoin(results, eq(results.candidateId, candidates.id))
      .groupBy(series.code, series.sortOrder)
      .orderBy(asc(series.sortOrder)),
    db.select({ decision: results.decision, n: count() }).from(results).groupBy(results.decision),
    db
      .select({ n: sql<number>`count(distinct ${scans.candidateId})::int` })
      .from(scans)
      .where(eq(scans.type, "fraud")),
    db
      .select({ status: documentRequests.status, n: count() })
      .from(documentRequests)
      .groupBy(documentRequests.status),
  ]);

  const total = byOffice.reduce((s, o) => s + o.n, 0);
  const deliberated = decisions.reduce((s, d) => s + d.n, 0);
  const admitted = decisions.find((d) => d.decision === "admitted")?.n ?? 0;
  const req = (k: string) => requests.find((r) => r.status === k)?.n ?? 0;
  const published = Boolean(session?.resultsPublishAt && session.resultsPublishAt <= new Date());

  return (
    <>
      <PageHeader
        eyebrow="Administration nationale"
        title={`Bac ${session?.year ?? ""} : vue nationale`}
        description={
          session?.resultsPublishAt
            ? `Résultats ${published ? "publiés" : "programmés"} le ${formatDateTime(session.resultsPublishAt)}.`
            : "Résultats non publiés."
        }
      />
      <div className="mb-6">
        <Alert tone="info">
          Données agrégées et anonymisées : aucun classement nominatif d&apos;élèves ni d&apos;établissements.
        </Alert>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div style={{ "--i": 0 } as React.CSSProperties}>
          <StatCard label="Candidats inscrits" value={total.toLocaleString("fr-FR")} icon={Users} />
        </div>
        <div style={{ "--i": 1 } as React.CSSProperties}>
          <StatCard
            label="Offices actifs"
            value={byOffice.filter((o) => o.active).length}
            icon={Building}
            tone="soleil"
            href="/admin/offices"
          />
        </div>
        <div style={{ "--i": 2 } as React.CSSProperties}>
          <StatCard
            label="Fraudes constatées"
            value={fraud.n}
            icon={ShieldAlert}
            tone="danger"
            hint="Candidats signalés en épreuve"
          />
        </div>
        <div style={{ "--i": 3 } as React.CSSProperties}>
          <StatCard
            label="Demandes en cours"
            value={req("pending") + req("validated") + req("pickup_scheduled")}
            icon={FileStack}
            tone="info"
            hint={`${req("delivered")} document(s) remis`}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Inscrits par Office">
          <BarList items={byOffice.map((o) => ({ key: String(o.id), label: o.name, value: o.n }))} />
        </Card>
        <Card
          title="Taux d'admission"
          description={deliberated ? `${deliberated} candidats délibérés` : "Aucune délibération"}
        >
          <div className="flex flex-col items-center gap-5">
            <Ring value={deliberated ? (admitted / deliberated) * 100 : 0} label="admis" />
            <div className="w-full">
              <StackedBar
                segments={[
                  { key: "a", label: "Admis", value: admitted, color: "var(--vert)" },
                  {
                    key: "f",
                    label: "Ajournés",
                    value: decisions.find((d) => d.decision === "failed")?.n ?? 0,
                    color: "var(--line-strong)",
                  },
                  {
                    key: "b",
                    label: "Absents",
                    value: decisions.find((d) => d.decision === "absent")?.n ?? 0,
                    color: "var(--soleil)",
                  },
                  {
                    key: "x",
                    label: "Fraudes",
                    value: decisions.find((d) => d.decision === "fraud")?.n ?? 0,
                    color: "var(--danger)",
                  },
                ]}
              />
            </div>
          </div>
        </Card>
        <Card title="Par série" padded={false}>
          <DataTable>
            <thead>
              <tr>
                <th>Série</th>
                <th>Inscrits</th>
                <th>Admis</th>
                <th>Taux</th>
              </tr>
            </thead>
            <tbody>
              {bySerie.map((s) => (
                <tr key={s.code}>
                  <td className="font-bold">{s.code}</td>
                  <td className="tabular-nums">{s.total}</td>
                  <td className="tabular-nums">{s.deliberated ? s.admitted : "—"}</td>
                  <td className="tabular-nums">
                    {s.deliberated ? `${Math.round((s.admitted / s.deliberated) * 100)} %` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      </div>
    </>
  );
}
