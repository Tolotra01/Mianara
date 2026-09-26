import type { Metadata } from "next";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { FilePlus2, FolderOpen } from "lucide-react";
import Link from "next/link";
import { FilterTabs } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import {
  Avatar,
  Card,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  StatusBadge,
} from "@/components/app/ui";
import { requireDb } from "@/db";
import { applications } from "@/db/schema-gestion";
import { requireSchool } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { APPLICATION_STATUS } from "@/lib/services/applications";
import { SendButton } from "../SendButton";

export const metadata: Metadata = { title: "Dossiers" };
const STATUSES = ["draft", "submitted", "incomplete", "rejected", "validated"] as const;

export default async function DossiersPage({ searchParams }: PageProps<"/ecole/dossiers">) {
  const user = await requireSchool();
  const params = await searchParams;
  const status =
    typeof params.statut === "string" && (STATUSES as readonly string[]).includes(params.statut)
      ? params.statut
      : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filters: SQL[] = [eq(applications.schoolId, user.schoolId)];
  if (status) filters.push(eq(applications.status, status as (typeof STATUSES)[number]));
  if (q) filters.push(or(ilike(applications.lastName, `%${q}%`), ilike(applications.firstName, `%${q}%`))!);
  const db = requireDb();
  const [rows, counts] = await Promise.all([
    db
      .select({ a: applications, hasPhoto: applications.photoMime })
      .from(applications)
      .where(and(...filters))
      .orderBy(desc(applications.updatedAt), asc(applications.lastName))
      .limit(200),
    db
      .select({ status: applications.status, n: count() })
      .from(applications)
      .where(eq(applications.schoolId, user.schoolId))
      .groupBy(applications.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Dossiers des élèves"
        description="Un dossier par élève. Les brouillons partent à l'Office quand vous cliquez sur Envoyer."
        actions={
          <>
            <LinkButton href="/ecole/dossiers/nouveau" variant="secondary">
              <FilePlus2 className="size-5" /> Nouveau dossier
            </LinkButton>
            {n("draft") > 0 && <SendButton count={n("draft")} />}
          </>
        }
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="statut"
            active={status}
            params={params}
            basePath="/ecole/dossiers"
            options={[
              { value: "", label: "Tous", count: counts.reduce((s, c) => s + c.n, 0) },
              ...STATUSES.map((s) => ({ value: s, label: APPLICATION_STATUS[s].label, count: n(s) })),
            ]}
          />
          <SearchInput placeholder="Nom ou prénom…" />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Aucun dossier"
            description="Créez le dossier de chaque élève inscrit au Bacc."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Élève</th>
                <th>Série</th>
                <th>Pièces</th>
                <th>État</th>
                <th>Mis à jour</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {rows.map(({ a, hasPhoto }, i) => (
                <tr key={a.id} style={{ "--i": Math.min(i, 15) } as React.CSSProperties}>
                  <td>
                    <Link href={`/ecole/dossiers/${a.id}`} className="flex items-center gap-3">
                      <Avatar
                        name={`${a.firstName} ${a.lastName}`}
                        src={hasPhoto ? `/api/dossiers/${a.id}/photo` : null}
                        size={36}
                      />
                      <span>
                        <span className="block font-bold hover:text-vert">
                          {a.lastName} {a.firstName}
                        </span>
                        {a.reviewNote && a.status !== "validated" && (
                          <span className="block max-w-xs truncate text-xs text-warning">{a.reviewNote}</span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="font-bold">{a.serieCode}</td>
                  <td className="tabular-nums">{a.pieces.length}/6</td>
                  <td>
                    <StatusBadge tone={APPLICATION_STATUS[a.status].tone}>
                      {APPLICATION_STATUS[a.status].label}
                    </StatusBadge>
                  </td>
                  <td className="whitespace-nowrap text-muted">{formatDateTime(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
