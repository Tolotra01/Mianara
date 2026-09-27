import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import { FilterTabs } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import { Avatar, Card, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { courseEnrollments, courses, teachers, users } from "@/db/schema-gestion";
import { requireCandidate } from "@/lib/auth";
import { formatAriary } from "@/lib/bac-rules";
import { COURSE_FORMAT } from "@/lib/labels";
import { ReserveButton } from "./ReserveButton";

export const metadata: Metadata = { title: "Cours" };

/** Cours ouverts d'un enseignant dont le compte est actif. */
const openCourses = and(eq(courses.status, "open"), eq(users.isActive, true))!;

export default async function CoursPage({ searchParams }: PageProps<"/candidat/cours">) {
  const { candidate } = await requireCandidate();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const matiere = typeof params.matiere === "string" ? params.matiere : "";
  const onlySerie = params.serie === "1";

  const db = requireDb();
  const filters: SQL[] = [openCourses];
  if (q) filters.push(or(ilike(courses.title, `%${q}%`), ilike(subjects.name, `%${q}%`))!);
  if (matiere) filters.push(eq(courses.subjectId, Number(matiere)));
  if (onlySerie) filters.push(or(eq(courses.serieCode, candidate.serieCode), sql`${courses.serieCode} is null`)!);

  const [rows, mine, subjectList, [{ openTotal }], [{ serieTotal }], [myActive]] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        format: courses.format,
        priceAriary: courses.priceAriary,
        capacity: courses.capacity,
        serieCode: courses.serieCode,
        subjectName: subjects.name,
        teacherName: users.fullName,
        city: teachers.city,
        yearsExperience: teachers.yearsExperience,
        seats: sql<number>`(
          select count(*)::int from ${courseEnrollments}
          where ${courseEnrollments.courseId} = ${courses.id}
            and ${courseEnrollments.status} in ('pending', 'confirmed')
        )`,
      })
      .from(courses)
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .innerJoin(teachers, eq(teachers.id, courses.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(and(...filters))
      .orderBy(desc(courses.updatedAt))
      .limit(60),
    db
      .select({
        courseId: courseEnrollments.courseId,
        id: courseEnrollments.id,
        status: courseEnrollments.status,
      })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.candidateId, candidate.id), ne(courseEnrollments.status, "cancelled"))),
    db
      .select({ id: subjects.id, name: subjects.name, n: count(courses.id) })
      .from(courses)
      .innerJoin(subjects, eq(subjects.id, courses.subjectId))
      .innerJoin(teachers, eq(teachers.id, courses.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(openCourses)
      .groupBy(subjects.id, subjects.name)
      .orderBy(desc(count(courses.id))),
    db
      .select({ openTotal: count() })
      .from(courses)
      .innerJoin(teachers, eq(teachers.id, courses.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(openCourses),
    db
      .select({ serieTotal: count() })
      .from(courses)
      .innerJoin(teachers, eq(teachers.id, courses.teacherId))
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(and(openCourses, or(eq(courses.serieCode, candidate.serieCode), sql`${courses.serieCode} is null`))),
    db
      .select({ n: count() })
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.candidateId, candidate.id),
          sql`${courseEnrollments.status} in ('pending', 'confirmed')`,
        ),
      ),
  ]);

  const mineByCourse = new Map(mine.map((m) => [m.courseId, m]));

  // Bascule « ma série », en conservant les autres filtres.
  const serieHref = (on: boolean) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (typeof v === "string" && v && k !== "serie" && k !== "page") sp.set(k, v);
    if (on) sp.set("serie", "1");
    return sp.size ? `/candidat/cours?${sp}` : "/candidat/cours";
  };

  return (
    <>
      <PageHeader
        title="Cours"
        description="Réservez les cours proposés par les enseignants libres. L'enseignant confirme chaque réservation : la place n'est acquise qu'après sa confirmation."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Cours ouverts" value={openTotal ?? 0} icon={BookOpen} tone="brand" />
        <StatCard label="Mes réservations actives" value={myActive?.n ?? 0} icon={GraduationCap} tone="soleil" />
        <StatCard
          label="Pour ma série"
          value={serieTotal ?? 0}
          icon={Users}
          tone="mena"
          hint={`Série ${candidate.serieCode}`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          options={subjectList.map((s) => ({ value: String(s.id), label: s.name, count: s.n }))}
          active={matiere}
          param="matiere"
          params={params}
          basePath="/candidat/cours"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-sunken p-1">
            <Link
              href={serieHref(!onlySerie)}
              scroll={false}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                onlySerie ? "bg-raised text-vert shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <GraduationCap className="size-4" />
              Ma série
            </Link>
          </div>
          <SearchInput placeholder="Titre, matière…" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Aucun cours disponible"
            description={
              q || matiere
                ? "Aucun cours ne correspond à cette recherche."
                : "Aucun enseignant n'a encore ouvert de cours."
            }
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {rows.map((c, i) => {
            const mineRow = mineByCourse.get(c.id);
            const full = c.capacity !== null && c.seats >= c.capacity;
            const otherSerie = c.serieCode !== null && c.serieCode !== candidate.serieCode;
            return (
              <section
                key={c.id}
                style={{ "--i": i } as React.CSSProperties}
                className="flex flex-col rounded-2xl border border-line bg-raised p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="t-h3 text-balance">{c.title}</h2>
                  {c.priceAriary > 0 ? (
                    <StatusBadge tone="brand">{formatAriary(c.priceAriary)}</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">Gratuit</StatusBadge>
                  )}
                </div>
                <p className="mt-0.5 text-sm font-semibold text-vert">{c.subjectName}</p>

                <div className="mt-3 flex items-center gap-2">
                  <Avatar name={c.teacherName} size={34} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.teacherName}</p>
                    <p className="text-xs text-muted">
                      {[c.city, c.yearsExperience > 0 ? `${c.yearsExperience} an(s)` : null]
                        .filter(Boolean)
                        .join(" · ") || "Enseignant libre"}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted">{c.description}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-sunken px-2.5 py-1 text-muted">{COURSE_FORMAT[c.format]}</span>
                  <span className="rounded-full bg-sunken px-2.5 py-1 text-muted">
                    {c.serieCode ? `Série ${c.serieCode}` : "Toutes séries"}
                  </span>
                  {full ? (
                    <span className="rounded-full bg-danger-soft px-2.5 py-1 text-danger">Complet</span>
                  ) : c.capacity !== null ? (
                    <span className="rounded-full bg-vert-soft px-2.5 py-1 text-vert">
                      {c.capacity - c.seats} place(s) restante(s)
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  {otherSerie && !mineRow ? (
                    <p className="text-sm font-semibold text-muted">
                      Réservé aux candidats de la série {c.serieCode}.
                    </p>
                  ) : full && !mineRow ? (
                    <p className="text-sm font-semibold text-muted">Plus de place disponible.</p>
                  ) : (
                    <ReserveButton
                      course={{
                        id: c.id,
                        teacherName: c.teacherName,
                        free: c.priceAriary === 0,
                        mine: mineRow
                          ? mineRow.status === "confirmed"
                            ? "confirmed"
                            : { id: mineRow.id }
                          : null,
                      }}
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
