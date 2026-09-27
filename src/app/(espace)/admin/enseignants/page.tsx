import type { Metadata } from "next";
import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { GraduationCap, Power } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Pagination } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import { Avatar, Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { courseEnrollments, courses, teacherSubjects, teachers, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { toggleTeacher } from "./actions";
import { TeacherCreate } from "./TeacherDialogs";
import { TeacherEdit } from "./TeacherEdit";

export const metadata: Metadata = { title: "Enseignants libres" };
const PER_PAGE = 30;

export default async function EnseignantsPage({ searchParams }: PageProps<"/admin/enseignants">) {
  await requireUser(["admin"]);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);
  const filters: SQL[] = [];
  if (q)
    filters.push(
      or(
        ilike(users.fullName, `%${q}%`),
        ilike(users.username, `%${q}%`),
        ilike(users.email, `%${q}%`),
        ilike(teachers.city, `%${q}%`),
      )!,
    );

  const db = requireDb();
  const [rows, [{ total }], subjectList, [stats]] = await Promise.all([
    db
      .select({
        teacherId: teachers.id,
        userId: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        mustChangePassword: users.mustChangePassword,
        lastLoginAt: users.lastLoginAt,
        city: teachers.city,
        bio: teachers.bio,
        yearsExperience: teachers.yearsExperience,
        courseCount: sql<number>`(
          select count(*)::int from ${courses} where ${courses.teacherId} = ${teachers.id}
        )`,
        openCount: sql<number>`(
          select count(*)::int from ${courses} where ${courses.teacherId} = ${teachers.id} and ${courses.status} = 'open'
        )`,
        enrollmentCount: sql<number>`(
          select count(*)::int from ${courseEnrollments}
          inner join ${courses} on ${courses.id} = ${courseEnrollments.courseId}
          where ${courses.teacherId} = ${teachers.id}
        )`,
      })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(users.fullName))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db
      .select({ total: count() })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .where(filters.length ? and(...filters) : undefined),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.name)),
    db
      .select({
        // `teachers` est joint à `courses` : compter des lignes compterait un
        // enseignant autant de fois qu'il a de cours. `::int` car un `count`
        // ressort en bigint, que le pilote expose comme une chaîne.
        total: sql<number>`count(distinct ${teachers.id})::int`,
        active: sql<number>`count(distinct ${teachers.id}) filter (where ${users.isActive} = true)::int`,
        open: sql<number>`count(${courses.id}) filter (where ${courses.status} = 'open')::int`,
      })
      .from(teachers)
      .innerJoin(users, eq(users.id, teachers.userId))
      .leftJoin(courses, eq(courses.teacherId, teachers.id)),
  ]);

  const [links, enrollments] = await Promise.all([
    db.select().from(teacherSubjects),
    db
      .select({ teacherId: courses.teacherId, n: count() })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(sql`${courseEnrollments.status} <> 'cancelled'`)
      .groupBy(courses.teacherId),
  ]);
  const subjectsByTeacher = new Map<string, number[]>();
  for (const l of links) {
    const list = subjectsByTeacher.get(l.teacherId) ?? [];
    list.push(l.subjectId);
    subjectsByTeacher.set(l.teacherId, list);
  }
  const enrollByTeacher = new Map(enrollments.map((e) => [e.teacherId, e.n]));

  return (
    <>
      <PageHeader
        title="Enseignants libres"
        description="Professeurs indépendants, sans rattachement à un établissement ni à un Office du Bacc. Ils publient leurs cours depuis leur espace et les candidat·es les réservent."
        actions={<TeacherCreate subjects={subjectList} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Enseignants", value: stats?.total ?? 0, hint: "comptes créés" },
          { label: "Comptes actifs", value: stats?.active ?? 0, hint: "accès ouvert" },
          { label: "Cours ouverts", value: stats?.open ?? 0, hint: "réservables" },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-sm font-semibold text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.hint}</p>
          </Card>
        ))}
      </div>

      <Card padded={false}>
        <div className="flex justify-end border-b border-line p-4">
          <SearchInput placeholder="Nom, identifiant, ville…" />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucun enseignant libre"
            description="Créez un compte pour chaque professeur indépendant autorisé à publier des cours."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Matières</th>
                <th>Cours</th>
                <th>Réservations</th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.teacherId}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={t.fullName} size={38} />
                      <div className="min-w-0">
                        <span className="font-bold">{t.fullName}</span>
                        <span className="block text-xs text-muted">
                          <Mono>{t.username}</Mono>
                          {t.city && ` · ${t.city}`}
                          {t.yearsExperience > 0 && ` · ${t.yearsExperience} an(s) d'expérience`}
                        </span>
                        <span className="block text-xs text-muted">
                          {t.email ?? "Sans email"}
                          {t.lastLoginAt ? ` · vu ${formatDateTime(t.lastLoginAt)}` : " · jamais connecté"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {subjectsByTeacher.get(t.teacherId)?.map((sid) => (
                        <span
                          key={sid}
                          className="rounded-full bg-sunken px-2 py-0.5 text-xs font-semibold text-muted"
                        >
                          {subjectList.find((s) => s.id === sid)?.name ?? sid}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>
                    <span className="font-bold tabular-nums">{t.courseCount}</span>
                    {t.openCount > 0 && (
                      <span className="ml-1 text-xs text-vert">({t.openCount} ouvert{t.openCount > 1 ? "s" : ""})</span>
                    )}
                  </td>
                  <td className="font-bold tabular-nums">{enrollByTeacher.get(t.teacherId) ?? 0}</td>
                  <td>
                    {!t.isActive ? (
                      <StatusBadge tone="neutral">Désactivé</StatusBadge>
                    ) : t.mustChangePassword ? (
                      <StatusBadge tone="warning">1re connexion à faire</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">Actif</StatusBadge>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <TeacherEdit
                        teacher={{
                          userId: t.userId,
                          fullName: t.fullName,
                          phone: t.phone,
                          city: t.city,
                          bio: t.bio,
                          yearsExperience: t.yearsExperience,
                          subjectIds: subjectsByTeacher.get(t.teacherId) ?? [],
                        }}
                        subjects={subjectList}
                      />
                      <ConfirmAction
                        action={toggleTeacher}
                        fields={{ id: t.userId }}
                        variant="ghost"
                        size="sm"
                        icon={<Power className="size-4" />}
                        label={t.isActive ? "Désactiver" : "Réactiver"}
                        title={t.isActive ? "Désactiver ce compte ?" : "Réactiver ce compte ?"}
                        description={
                          t.isActive
                            ? "L'enseignant perdra l'accès à son espace et ses cours ouverts seront clos."
                            : "L'enseignant retrouvera l'accès et pourra publier de nouveaux cours."
                        }
                      />
                    </div>
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
          basePath="/admin/enseignants"
        />
      </Card>
    </>
  );
}
