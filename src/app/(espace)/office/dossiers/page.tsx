import type { Metadata } from "next";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import { Inbox } from "lucide-react";
import { FilterTabs } from "@/components/app/Pagination";
import { Card, EmptyState, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { applications, schools } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { APPLICATION_STATUS } from "@/lib/services/applications";
import { validateApplications } from "./actions";
import { BulkValidate } from "./BulkValidate";

export const metadata: Metadata = { title: "Dossiers des écoles" };
const STATUSES = ["submitted", "incomplete", "rejected", "validated"] as const;

export default async function DossiersOfficePage({ searchParams }: PageProps<"/office/dossiers">) {
  const user = await requireOffice();
  const params = await searchParams;
  const status =
    typeof params.statut === "string" && (STATUSES as readonly string[]).includes(params.statut)
      ? params.statut
      : "submitted";
  const school = Number(params.ecole) || 0;
  const db = requireDb();
  const filters: SQL[] = [
    eq(schools.officeId, user.officeId),
    eq(applications.status, status as (typeof STATUSES)[number]),
  ];
  if (school) filters.push(eq(applications.schoolId, school));

  const [rows, counts, schoolList] = await Promise.all([
    db
      .select({ a: applications, school: schools.name })
      .from(applications)
      .innerJoin(schools, eq(schools.id, applications.schoolId))
      .where(and(...filters))
      .orderBy(desc(applications.submittedAt), asc(applications.lastName))
      .limit(300),
    db
      .select({ status: applications.status, n: count() })
      .from(applications)
      .innerJoin(schools, eq(schools.id, applications.schoolId))
      .where(and(eq(schools.officeId, user.officeId), ...(school ? [eq(applications.schoolId, school)] : [])))
      .groupBy(applications.status),
    db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.officeId, user.officeId))
      .orderBy(asc(schools.name)),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Dossiers des écoles"
        description="Les écoles envoient les dossiers de leurs élèves. Validez-les pour créer les candidats et leurs convocations, ou renvoyez-les avec un motif."
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="statut"
            active={status}
            params={params}
            basePath="/office/dossiers"
            options={STATUSES.map((s) => ({
              value: s,
              label: s === "submitted" ? "À traiter" : APPLICATION_STATUS[s].label,
              count: n(s),
            }))}
          />
          <form className="flex items-center gap-2">
            <input type="hidden" name="statut" value={status} />
            <select
              name="ecole"
              defaultValue={school || ""}
              className="field-input h-10 w-64"
              aria-label="Filtrer par école"
            >
              <option value="">Toutes les écoles</option>
              {schoolList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-md border border-line-strong px-3 text-sm font-semibold hover:border-vert"
            >
              Filtrer
            </button>
          </form>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucun dossier ici"
            description={
              status === "submitted" ? "Les dossiers envoyés par les écoles arriveront ici." : undefined
            }
          />
        ) : (
          <BulkValidate
            action={validateApplications}
            rows={rows.map(({ a, school }) => ({
              id: a.id,
              name: `${a.lastName} ${a.firstName}`,
              school,
              serie: a.serieCode,
              pieces: a.pieces.length,
              photo: Boolean(a.photoMime),
              status: { label: APPLICATION_STATUS[a.status].label, tone: APPLICATION_STATUS[a.status].tone },
              selectable: a.status === "submitted",
              sentAt: a.submittedAt ? formatDateTime(a.submittedAt) : "—",
            }))}
          />
        )}
      </Card>
    </>
  );
}
