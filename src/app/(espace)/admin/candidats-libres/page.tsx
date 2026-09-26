import type { Metadata } from "next";
import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/app/charts";
import { Pagination } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import { Card, DataTable, EmptyState, LinkButton, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidates, offices } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/bac-rules";
import { CANDIDATE_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Candidats libres" };
const PER_PAGE = 30;

export default async function CandidatsLibresPage({ searchParams }: PageProps<"/admin/candidats-libres">) {
  await requireUser(["admin"]);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);
  const filters: SQL[] = [eq(candidates.kind, "libre")];
  if (q)
    filters.push(
      or(
        ilike(candidates.lastName, `%${q}%`),
        ilike(candidates.firstName, `%${q}%`),
        ilike(candidates.matricule, `%${q}%`),
      )!,
    );
  const db = requireDb();
  const [rows, [{ total }], byOffice] = await Promise.all([
    db
      .select({ c: candidates, office: offices.city })
      .from(candidates)
      .innerJoin(offices, eq(offices.id, candidates.officeId))
      .where(and(...filters))
      .orderBy(asc(candidates.lastName))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db
      .select({ total: count() })
      .from(candidates)
      .where(and(...filters)),
    db
      .select({ id: offices.id, city: offices.city, n: count(candidates.id) })
      .from(offices)
      .leftJoin(candidates, and(eq(candidates.officeId, offices.id), eq(candidates.kind, "libre")))
      .groupBy(offices.id)
      .orderBy(asc(offices.id)),
  ]);

  return (
    <>
      <PageHeader
        title="Candidats libres"
        description="Personnes qui se présentent au Bacc sans établissement. Enregistrez-les, corrigez leur dossier ou gérez leur compte."
        actions={
          <LinkButton href="/admin/candidats-libres/nouveau">
            <Plus className="size-5" /> Nouveau candidat libre
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card title="Par Office">
          <BarList items={byOffice.map((o) => ({ key: String(o.id), label: o.city, value: o.n }))} />
        </Card>
        <Card padded={false}>
          <div className="flex justify-end border-b border-line p-4">
            <SearchInput placeholder="Nom, matricule…" />
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="Aucun candidat libre"
              description="Enregistrez un candidat avec le bouton « Nouveau candidat libre »."
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Matricule</th>
                  <th>Série</th>
                  <th>Office</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, office }) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/admin/candidats-libres/${c.id}`}
                        className="font-bold hover:text-vert hover:underline"
                      >
                        {c.lastName} {c.firstName}
                      </Link>
                      <span className="block text-xs text-muted">
                        Né(e) le {formatDate(c.birthDate)} · {c.address ?? c.birthPlace}
                      </span>
                    </td>
                    <td>
                      <Mono>{c.matricule}</Mono>
                    </td>
                    <td className="font-bold">{c.serieCode}</td>
                    <td>{office}</td>
                    <td>
                      <StatusBadge tone={CANDIDATE_STATUS[c.status].tone}>
                        {CANDIDATE_STATUS[c.status].label}
                      </StatusBadge>
                    </td>
                    <td className="text-right">
                      <LinkButton href={`/admin/candidats-libres/${c.id}`} variant="secondary" size="sm">
                        Gérer
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
          <Pagination
            page={page}
            pages={Math.ceil(total / PER_PAGE)}
            total={total}
            params={params}
            basePath="/admin/candidats-libres"
          />
        </Card>
      </div>
    </>
  );
}
