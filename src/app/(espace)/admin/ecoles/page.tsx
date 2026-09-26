import type { Metadata } from "next";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { MapPin, Power, School } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { FilterTabs } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { offices, schools, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { toggleSchool } from "../actions";
import { SchoolAccountDialog, SchoolDialog } from "./SchoolDialogs";

export const metadata: Metadata = { title: "Écoles" };

export default async function EcolesAdminPage({ searchParams }: PageProps<"/admin/ecoles">) {
  await requireUser(["admin"]);
  const params = await searchParams;
  const office = Number(params.office) || 0;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filters: SQL[] = [];
  if (office) filters.push(eq(schools.officeId, office));
  if (q)
    filters.push(
      or(ilike(schools.name, `%${q}%`), ilike(schools.commune, `%${q}%`), ilike(schools.code, `%${q}%`))!,
    );
  const db = requireDb();
  const [list, officeList, accounts] = await Promise.all([
    db
      .select({
        s: schools,
        office: offices.city,
        candidates: sql<number>`(select count(*)::int from candidates c where c.school_id = "schools"."id")`,
        pending: sql<number>`(select count(*)::int from applications a where a.school_id = "schools"."id" and a.status = 'submitted')`,
      })
      .from(schools)
      .innerJoin(offices, eq(offices.id, schools.officeId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(offices.id), asc(schools.name)),
    db
      .select({ id: offices.id, name: offices.name, city: offices.city })
      .from(offices)
      .orderBy(asc(offices.id)),
    db
      .select({
        schoolId: users.schoolId,
        username: users.username,
        active: users.isActive,
        first: users.mustChangePassword,
      })
      .from(users)
      .where(eq(users.role, "school")),
  ]);

  return (
    <>
      <PageHeader
        title="Écoles"
        description="Établissements qui présentent des candidats au Bacc, rattachés à leur Office. Chaque école reçoit un compte pour envoyer ses dossiers."
        actions={<SchoolDialog offices={officeList} />}
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="office"
            active={office ? String(office) : ""}
            params={params}
            basePath="/admin/ecoles"
            options={[
              { value: "", label: "Tous les Offices" },
              ...officeList.map((o) => ({ value: String(o.id), label: o.city })),
            ]}
          />
          <SearchInput placeholder="Nom, commune, code…" />
        </div>
        {list.length === 0 ? (
          <EmptyState
            icon={School}
            title="Aucune école"
            description="Créez les établissements et leurs comptes d'accès."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>École</th>
                <th>Office</th>
                <th>Candidats</th>
                <th>Dossiers à traiter</th>
                <th>Comptes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map(({ s, office: officeCity, candidates, pending }) => {
                const mine = accounts.filter((a) => a.schoolId === s.id);
                return (
                  <tr key={s.id} className={s.isActive ? "" : "opacity-60"}>
                    <td>
                      <span className="font-bold">{s.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="size-3" /> {s.commune} · {s.kind === "prive" ? "Privé" : "Public"}{" "}
                        · <Mono>{s.code}</Mono>
                      </span>
                    </td>
                    <td>{officeCity}</td>
                    <td className="font-bold tabular-nums">{candidates}</td>
                    <td className="tabular-nums">
                      {pending ? <StatusBadge tone="info">{pending}</StatusBadge> : "—"}
                    </td>
                    <td className="text-xs">
                      {mine.length === 0 ? (
                        <span className="text-muted">Aucun</span>
                      ) : (
                        mine.map((a) => (
                          <span key={a.username} className="block">
                            <Mono>{a.username}</Mono>{" "}
                            {!a.active ? "· fermé" : a.first ? "· 1re connexion" : ""}
                          </span>
                        ))
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <SchoolAccountDialog schoolId={s.id} schoolName={s.name} />
                        <SchoolDialog school={s} offices={officeList} />
                        <ConfirmAction
                          action={toggleSchool}
                          fields={{ id: String(s.id) }}
                          variant="ghost"
                          size="sm"
                          icon={<Power className="size-4" />}
                          label={<span className="sr-only">{s.isActive ? "Désactiver" : "Réactiver"}</span>}
                          title={s.isActive ? `Désactiver ${s.name} ?` : `Réactiver ${s.name} ?`}
                          description={
                            s.isActive
                              ? "Ses comptes seront fermés ; ses candidats restent convoqués."
                              : undefined
                          }
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
