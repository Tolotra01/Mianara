import type { Metadata } from "next";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { FileDown } from "lucide-react";
import { Pagination } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import { Card, DataTable, LinkButton, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { auditLogs, users } from "@/db/schema-gestion";
import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { actionLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Journal d'audit" };
const PER_PAGE = 30;

export default async function JournalPage({ searchParams }: PageProps<"/admin/journal">) {
  await requireUser(["admin"]);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);
  const filters: SQL[] = [];
  if (q)
    filters.push(
      or(
        ilike(auditLogs.action, `%${q}%`),
        ilike(users.fullName, `%${q}%`),
        ilike(users.username, `%${q}%`),
        eq(auditLogs.recordId, q),
      )!,
    );
  const where = filters.length ? and(...filters) : undefined;
  const db = requireDb();
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ l: auditLogs, name: users.fullName, role: users.role })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db
      .select({ total: count() })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where),
  ]);
  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Toutes les actions d'écriture, non modifiables : qui, quoi, quand, depuis quelle adresse (RG-17)."
        actions={
          <LinkButton href="/api/export/journal" variant="secondary" prefetch={false}>
            <FileDown className="size-5" /> Exporter (CSV)
          </LinkButton>
        }
      />
      <Card padded={false}>
        <div className="flex justify-end border-b border-line p-4">
          <SearchInput placeholder="Action, personne, identifiant…" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Auteur</th>
              <th>Action</th>
              <th>Objet</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ l, name, role }) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</td>
                <td>
                  <span className="font-semibold">{name ?? "Système"}</span>
                  {role && <span className="block text-xs text-muted">{ROLE_LABEL[role]}</span>}
                </td>
                <td className="font-semibold">{actionLabel(l.action)}</td>
                <td className="font-mono text-xs text-muted">
                  {l.tableName ? `${l.tableName}${l.recordId ? ` · ${l.recordId.slice(0, 8)}` : ""}` : "—"}
                </td>
                <td className="font-mono text-xs text-muted">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <Pagination
          page={page}
          pages={Math.ceil(total / PER_PAGE)}
          total={total}
          params={params}
          basePath="/admin/journal"
        />
      </Card>
    </>
  );
}
