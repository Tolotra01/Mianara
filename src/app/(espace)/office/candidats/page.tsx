import type { Metadata } from "next";
import { and, asc, count, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { FileDown, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { FilterTabs, Pagination } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import {
  Avatar,
  Card,
  DataTable,
  EmptyState,
  LinkButton,
  Mono,
  PageHeader,
  StatusBadge,
} from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidatePhotos, candidates, examCenters, rooms } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { CANDIDATE_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Candidats" };

const PER_PAGE = 20;
const SERIE_ORDER = ["L", "S", "OSE", "TI", "TGC", "TT", "TA"];

export default async function CandidatsPage({ searchParams }: PageProps<"/office/candidats">) {
  const user = await requireOffice();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const serie = typeof params.serie === "string" ? params.serie : "";
  const salle = typeof params.salle === "string" ? params.salle : "";
  const type = params.type === "libre" || params.type === "ecole" ? params.type : "";
  const ecole = Number(params.ecole) || 0;
  const page = Math.max(1, Number(params.page) || 1);

  const filters: SQL[] = [eq(candidates.officeId, user.officeId)];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(candidates.lastName, like),
        ilike(candidates.firstName, like),
        ilike(candidates.matricule, like),
        ilike(candidates.schoolName, like),
      )!,
    );
  }
  if (serie) filters.push(eq(candidates.serieCode, serie));
  if (salle === "sans") filters.push(isNull(candidates.roomId));
  if (type) filters.push(eq(candidates.kind, type));
  if (ecole) filters.push(eq(candidates.schoolId, ecole));
  const where = and(...filters);

  const db = requireDb();
  const [rows, [{ total }], bySerie] = await Promise.all([
    db
      .select({
        id: candidates.id,
        matricule: candidates.matricule,
        lastName: candidates.lastName,
        firstName: candidates.firstName,
        serie: candidates.serieCode,
        kind: candidates.kind,
        school: candidates.schoolName,
        status: candidates.status,
        center: examCenters.name,
        room: rooms.name,
        seat: candidates.seatNumber,
        hasPhoto: candidatePhotos.candidateId,
      })
      .from(candidates)
      .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
      .leftJoin(rooms, eq(rooms.id, candidates.roomId))
      .leftJoin(candidatePhotos, eq(candidatePhotos.candidateId, candidates.id))
      .where(where)
      .orderBy(asc(candidates.lastName), asc(candidates.firstName))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(candidates).where(where),
    db
      .select({ serie: candidates.serieCode, n: count() })
      .from(candidates)
      .where(eq(candidates.officeId, user.officeId))
      .groupBy(candidates.serieCode),
  ]);
  const all = bySerie.reduce((s, x) => s + x.n, 0);
  const n = (code: string) => bySerie.find((b) => b.serie === code)?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Candidats"
        description="Candidats enregistrés par votre Office. Chaque enregistrement génère la convocation et les identifiants."
        actions={
          <>
            <LinkButton href="/api/export/candidats" variant="secondary" prefetch={false}>
              <FileDown className="size-5" /> Exporter (CSV)
            </LinkButton>
            {!user.visiting && (
              <LinkButton href="/office/candidats/nouveau">
                <UserPlus className="size-5" /> Enregistrer un candidat
              </LinkButton>
            )}
          </>
        }
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="serie"
            active={serie}
            params={params}
            basePath="/office/candidats"
            options={[
              { value: "", label: "Toutes", count: all },
              // Séries ayant des candidats (Bac général puis technique).
              ...bySerie
                .map((b) => b.serie)
                .sort((a, b) => SERIE_ORDER.indexOf(a) - SERIE_ORDER.indexOf(b))
                .map((code) => ({ value: code, label: code, count: n(code) })),
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterTabs
              param="type"
              active={type}
              params={params}
              basePath="/office/candidats"
              options={[
                { value: "", label: "Tous" },
                { value: "ecole", label: "D'école" },
                { value: "libre", label: "Libres" },
              ]}
            />
            <Link
              href={salle ? "/office/candidats" : "/office/candidats?salle=sans"}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${salle ? "bg-soleil text-ink" : "text-muted hover:bg-sunken"}`}
            >
              Sans salle
            </Link>
            <SearchInput placeholder="Nom, matricule, établissement…" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              q || serie || salle || type || ecole
                ? "Aucun candidat ne correspond"
                : "Aucun candidat enregistré"
            }
            description={
              q || serie || salle
                ? "Modifiez la recherche ou les filtres."
                : "Enregistrez le premier dossier validé par l'Office."
            }
            action={
              !q && !serie && !salle ? (
                <LinkButton href="/office/candidats/nouveau">
                  <UserPlus className="size-5" /> Enregistrer un candidat
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Matricule</th>
                <th>Série</th>
                <th>Centre · salle</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {rows.map((c, i) => (
                <tr key={c.id} style={{ "--i": i } as React.CSSProperties} className="cursor-pointer">
                  <td>
                    <Link href={`/office/candidats/${c.id}`} className="flex items-center gap-3">
                      <Avatar
                        name={`${c.firstName} ${c.lastName}`}
                        src={c.hasPhoto ? `/api/photos/${c.id}` : null}
                        size={36}
                      />
                      <span>
                        <span className="block font-bold hover:text-vert">
                          {c.lastName} {c.firstName}
                        </span>
                        <span className="block text-xs text-muted">
                          {c.kind === "ecole" ? c.school : "Candidat libre"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Mono>{c.matricule}</Mono>
                  </td>
                  <td>
                    <span className="rounded-md bg-sunken px-2 py-0.5 font-bold">{c.serie}</span>
                  </td>
                  <td>
                    {c.room ? (
                      <span>
                        <span className="block">{c.center}</span>
                        <span className="block text-xs text-muted">
                          {c.room} · place {c.seat}
                        </span>
                      </span>
                    ) : (
                      <StatusBadge tone="warning">Sans salle</StatusBadge>
                    )}
                  </td>
                  <td>
                    <StatusBadge tone={CANDIDATE_STATUS[c.status].tone}>
                      {CANDIDATE_STATUS[c.status].label}
                    </StatusBadge>
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
          basePath="/office/candidats"
        />
      </Card>
    </>
  );
}
