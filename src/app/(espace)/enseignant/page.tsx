import type { Metadata } from "next";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { BookOpen, Eye, GraduationCap, Power, Users } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import {
  buttonClass,
  Card,
  DataTable,
  EmptyState,
  Mono,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/app/ui";
import { submitLearningListing, submitTeacherProof } from "@/app/(vitrine)/enseignant/actions";
import { requireDb } from "@/db";
import { series as seriesTable, subjects } from "@/db/schema";
import {
  candidates,
  coachingPayments,
  coachingSessions,
  courseEnrollments,
  courses,
  learningListings,
  teacherDocuments,
  teacherProfiles,
  teacherSubjects,
} from "@/db/schema-gestion";
import { requireTeacher } from "@/lib/auth";
import { formatAriary } from "@/lib/bac-rules";
import { COURSE_FORMAT, COURSE_STATUS } from "@/lib/labels";
import { SERIES } from "@/lib/learning";
import { closeCourse, publishCourse } from "./actions";
import { CourseCreate, CourseEdit } from "./CourseDialogs";

export const metadata: Metadata = { title: "Espace enseignant" };

const REVIEW_LABEL = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
  verified: "Vérifié",
} as const;

export default async function EnseignantPage() {
  const { teacher, user } = await requireTeacher();
  const db = requireDb();
  const [
    courseList,
    subjectList,
    seriesList,
    [pendingStat],
    [openStat],
    [totalStat],
    [profile],
    docs,
    listings,
    coaching,
  ] = await Promise.all([
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
    db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, user.id)).limit(1),
    db.select().from(teacherDocuments).where(eq(teacherDocuments.teacherId, user.id)),
    db
      .select()
      .from(learningListings)
      .where(eq(learningListings.teacherId, user.id))
      .orderBy(desc(learningListings.createdAt)),
    db
      .select({
        id: coachingSessions.id,
        listing: learningListings.title,
        serie: candidates.serieCode,
        status: coachingSessions.status,
        payment: coachingPayments.status,
      })
      .from(coachingSessions)
      .innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
      .innerJoin(learningListings, eq(learningListings.id, coachingSessions.listingId))
      .innerJoin(candidates, eq(candidates.id, coachingSessions.candidateId))
      .where(eq(learningListings.teacherId, user.id))
      .orderBy(desc(coachingSessions.createdAt)),
  ]);

  const proof = new Map(docs.map((doc) => [doc.kind, doc]));
  const verification = REVIEW_LABEL[profile?.verificationStatus ?? "pending"];
  return (
    <>
      <PageHeader
        title="Espace enseignant"
        description="Publiez vos cours, soumettez vos offres d'accompagnement et suivez vos réservations. La validation admin est requise avant toute publication aux candidats."
      />

      <Card
        title="Profil et justificatifs"
        description={`Matière : ${profile?.subjectCode ?? "—"} · Vérification : ${verification}`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(["identity", "qualification"] as const).map((kind) => (
            <div key={kind} className="rounded-xl border border-line p-4">
              <p className="font-bold">{kind === "identity" ? "Pièce d'identité" : "Diplôme ou qualification"}</p>
              <p className="mt-1 text-sm text-muted">
                {proof.get(kind) ? REVIEW_LABEL[proof.get(kind)!.status] : "Non transmis"}
              </p>
              <ActionForm action={submitTeacherProof} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="kind" value={kind} />
                <input
                  type="file"
                  name="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  className="max-w-full text-sm"
                />
                <SubmitButton className="rounded-lg bg-vert px-3 py-2 text-sm font-bold text-on-vert">
                  Transmettre
                </SubmitButton>
                <p className="w-full text-xs text-muted">PDF, JPEG ou PNG, 3 Mo maximum.</p>
              </ActionForm>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-10">
        <h2 className="t-h2">Mes cours</h2>
        <p className="mt-1 text-sm text-muted">
          Ils apparaissent dans l&apos;espace des candidat·es, qui les réservent directement. Vous confirmez ensuite
          chaque réservation.
        </p>
      </div>

      {subjectList.length === 0 && (
        <div className="mb-6 mt-4">
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

      <div className="mb-6 mt-4 grid gap-4 sm:grid-cols-3">
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
                    <h3 className="t-h3 text-balance">{c.title}</h3>
                    <p className="mt-0.5 text-sm text-muted">
                      {c.subjectName}
                      {c.serieCode ? ` · série ${c.serieCode}` : " · à toutes séries"}
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
                  <span
                    className={`rounded-full px-2.5 py-1 ${full ? "bg-danger-soft text-danger" : "bg-sunken text-muted"}`}
                  >
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
      <div className="mt-10">
        <h2 className="t-h2">Mes offres d&apos;accompagnement</h2>
        <p className="mt-1 text-sm text-muted">
          Formations et coachingonte à la demande des candidat·es. Soumis à validation avant publication.
        </p>
      </div>

      <Card
        className="mt-4"
        title="Créer une offre"
        description="Les nouvelles offres sont soumises à l'approbation de l'administration."
      >
        <ActionForm action={submitLearningListing} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            Type
            <select className="field-input" name="kind" required>
              <option value="course">Cours</option>
              <option value="training">Formation</option>
              <option value="coaching">Coaching</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Prix (MGA; vide = gratuit)
            <input className="field-input" type="number" min="0" max="100000000" name="priceAmount" />
          </label>
          <label className="grid gap-1 text-sm font-semibold md:col-span-2">
            Séries concernées
            <select className="field-input min-h-28" name="series" multiple required>
              {SERIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Titre
            <input className="field-input" name="title" minLength={4} maxLength={120} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Durée en minutes (facultatif)
            <input className="field-input" type="number" min="1" max="6000" name="durationMinutes" />
          </label>
          <label className="grid gap-1 text-sm font-semibold md:col-span-2">
            Description
            <textarea className="field-input" name="description" minLength={10} maxLength={500} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold md:col-span-2">
            Contenu
            <textarea className="field-input" name="content" rows={7} minLength={10} maxLength={20000} required />
          </label>
          <div className="md:col-span-2">
            <SubmitButton className="rounded-xl bg-vert px-4 py-3 font-bold text-on-vert">
              Soumettre pour validation
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card className="mt-6" title="Mes offres">
        {listings.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Offre</th>
                <th>Séries</th>
                <th>Prix</th>
                <th>Validation</th>
                <th>Note admin</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <span className="block text-xs text-muted">
                      {item.kind} · {item.subjectCode}
                    </span>
                  </td>
                  <td>{item.series.join(", ")}</td>
                  <td>{item.priceAmount === null ? "Gratuit" : `${item.priceAmount.toLocaleString("fr-FR")} MGA`}</td>
                  <td>
                    <StatusBadge
                      tone={
                        item.reviewStatus === "approved"
                          ? "success"
                          : item.reviewStatus === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {REVIEW_LABEL[item.reviewStatus]}
                    </StatusBadge>
                  </td>
                  <td>{item.reviewNote ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-muted">Aucune offre soumise.</p>
        )}
      </Card>

      <Card className="mt-6" title="Demandes de coaching">
        {coaching.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Offre</th>
                <th>Série du candidat</th>
                <th>Paiement</th>
                <th>Chat</th>
              </tr>
            </thead>
            <tbody>
              {coaching.map((s) => (
                <tr key={s.id}>
                  <td>{s.listing}</td>
                  <td>{s.serie ?? "—"}</td>
                  <td>{REVIEW_LABEL[s.payment]}</td>
                  <td>
                    {s.status === "active" ? (
                      <a href={`/enseignant/sessions/${s.id}`} className="font-bold text-vert underline">
                        Ouvrir le chat
                      </a>
                    ) : (
                      "Après validation du paiement"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-muted">Aucune demande reçue.</p>
        )}
        <p className="mt-2 text-xs text-muted">
          Les noms et identifiants des candidats ne sont jamais affichés.
        </p>
      </Card>

      <p className="mt-8 text-sm text-muted">
        Compte <Mono>{user.username}</Mono> · enseignant libre, sans rattachement.
      </p>
    </>
  );
}
