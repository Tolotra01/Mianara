import type { Metadata } from "next";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { BookOpen, Eye, GraduationCap, Power, Users } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { buttonClass, Card, EmptyState, Mono, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { series as seriesTable, subjects } from "@/db/schema";
import { courseEnrollments, courses, teacherSubjects } from "@/db/schema-gestion";
import { requireTeacher } from "@/lib/auth";
import { formatAriary } from "@/lib/bac-rules";
import { COURSE_FORMAT, COURSE_STATUS } from "@/lib/labels";
import { closeCourse, publishCourse } from "./actions";
import { CourseCreate, CourseEdit } from "./CourseDialogs";

export const metadata: Metadata = { title: "Mes cours" };

export default async function EnseignantPage() {
  const { teacher, user } = await requireTeacher();
  const db = requireDb();
  const [courseList, subjectList, seriesList, [pendingStat], [openStat], [totalStat]] =
    await Promise.all([
      db
        .select({
          id: courses.id,
          title: courses.title,
          description: courses.description,
          subjectId: courses.subjectId,
          subjectName: subjects.name,
          serieCode: courses.serieCode,
          format: courses.format,
          priceAriary: courses.priceAriary,
          capacity: courses.capacity,
          status: courses.status,
          createdAt: courses.createdAt,
          seats: sql<number>`(
            select count(*)::int from ${courseEnrollments}
            where ${courseEnrollments.courseId} = ${courses.id}
              and ${courseEnrollments.status} in ('pending', 'confirmed')
          )`,
          waiting: sql<number>`(
            select count(*)::int from ${courseEnrollments}
            where ${courseEnrollments.courseId} = ${courses.id}
              and ${courseEnrollments.status} = 'pending'
          )`,
        })
        .from(courses)
        .innerJoin(subjects, eq(subjects.id, courses.subjectId))
        .where(eq(courses.teacherId, teacher.id))
        .orderBy(desc(courses.updatedAt)),
      db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .innerJoin(teacherSubjects, eq(teacherSubjects.subjectId, subjects.id))
        .where(eq(teacherSubjects.teacherId, teacher.id))
        .orderBy(subjects.name),
      db.select({ code: seriesTable.code, name: seriesTable.name }).from(seriesTable).orderBy(seriesTable.code),
      db
        .select({ n: count() })
        .from(courseEnrollments)
        .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
        .where(and(eq(courses.teacherId, teacher.id), eq(courseEnrollments.status, "pending"))),
      db
        .select({ n: count() })
        .from(courses)
        .where(and(eq(courses.teacherId, teacher.id), eq(courses.status, "open"))),
      db.select({ n: count() }).from(courses).where(eq(courses.teacherId, teacher.id)),
    ]);

  return (
    <>
      <PageHeader
        title="Mes cours"
        description="Publiez vos cours : ils apparaissent dans l'espace des candidat·es, qui les réservent directement. Vous confirmez ensuite chaque réservation."
        actions={<CourseCreate subjects={subjectList} series={seriesList} />}
      />

      {subjectList.length === 0 && (
        <div className="mb-6">
          <Card title="Matières à déclarer">
            <p className="text-sm text-muted">
              Déclarez les matières que vous enseignez depuis votre profil : un cours doit porter sur l&apos;une
              d&apos;entre elles.
            </p>
            <a href="/enseignant/profil" className={`${buttonClass("secondary", "sm")} mt-3`}>
              Compléter mon profil
            </a>
          </Card>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Cours publiés au total" value={totalStat?.n ?? 0} icon={BookOpen} tone="brand" />
        <StatCard
          label="Ouverts aux réservations"
          value={openStat?.n ?? 0}
          icon={Eye}
          tone="soleil"
          href="/enseignant/inscriptions"
        />
        <StatCard label="Réservations à traiter" value={pendingStat?.n ?? 0} icon={Users} tone="mena" />
      </div>

      {courseList.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="Aucun cours publié"
            description="Créez votre premier cours : il démarre en brouillon, vous l'ouvrez ensuite aux réservations."
            action={<CourseCreate subjects={subjectList} series={seriesList} />}
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 xl:grid-cols-2">
          {courseList.map((c, i) => {
            const status = COURSE_STATUS[c.status];
            const full = c.capacity !== null && c.seats >= c.capacity;
            return (
              <section
                key={c.id}
                style={{ "--i": i } as React.CSSProperties}
                className="flex flex-col rounded-2xl border border-line bg-raised p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="t-h3 text-balance">{c.title}</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {c.subjectName}
                      {c.serieCode ? ` · série ${c.serieCode}` : " · toutes séries"}
                    </p>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>

                <p className="mt-3 line-clamp-3 text-sm">{c.description}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-sunken px-2.5 py-1 text-muted">
                    {COURSE_FORMAT[c.format]}
                  </span>
                  <span className="rounded-full bg-sunken px-2.5 py-1 text-muted">
                    {c.priceAriary > 0 ? formatAriary(c.priceAriary) : "Gratuit"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 ${full ? "bg-danger-soft text-danger" : "bg-sunken text-muted"}`}>
                    {c.capacity === null ? "Places illimitées" : `${c.seats}/${c.capacity} places`}
                  </span>
                  {c.waiting > 0 && (
                    <span className="rounded-full bg-soleil px-2.5 py-1 text-ink">
                      {c.waiting} à traiter
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <CourseEdit course={c} subjects={subjectList} series={seriesList} />
                  {c.status === "open" ? (
                    <ConfirmAction
                      action={closeCourse}
                      fields={{ id: String(c.id) }}
                      variant="secondary"
                      size="sm"
                      icon={<Power className="size-4" />}
                      label="Clore"
                      title="Clore ce cours ?"
                      description="Il ne sera plus proposé aux candidat·es. Les réservations déjà reçues restent visibles."
                    />
                  ) : (
                    <ConfirmAction
                      action={publishCourse}
                      fields={{ id: String(c.id) }}
                      variant="primary"
                      size="sm"
                      icon={<Eye className="size-4" />}
                      label={c.status === "closed" ? "Rouvrir" : "Ouvrir"}
                      title={c.status === "closed" ? "Rouvrir ce cours ?" : "Ouvrir aux réservations ?"}
                      description="Le cours devient visible et réservable par les candidat·es de la bonne série."
                    />
                  )}
                  {c.waiting > 0 && (
                    <a href="/enseignant/inscriptions" className={`${buttonClass("ghost", "sm")} ml-auto`}>
                      <Users className="size-4" /> Traiter les réservations
                    </a>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-sm text-muted">
        Compte <Mono>{user.username}</Mono> · enseignant libre, sans rattachement.
      </p>
    </>
  );
}
