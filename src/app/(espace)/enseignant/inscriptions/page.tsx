import type { Metadata } from "next";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Check, Users, X } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { candidates, courseEnrollments, courses } from "@/db/schema-gestion";
import { requireTeacher } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { COURSE_FORMAT, COURSE_STATUS, ENROLLMENT_STATUS } from "@/lib/labels";
import { decideEnrollment } from "../actions";

export const metadata: Metadata = { title: "Réservations" };

export default async function InscriptionsPage({
  searchParams,
}: PageProps<"/enseignant/inscriptions">) {
  const { teacher } = await requireTeacher();
  const params = await searchParams;
  const only: ("pending" | "confirmed" | "cancelled")[] =
    params.statut === "traiter" ? ["pending"] : ["pending", "confirmed"];
  const db = requireDb();
  const rows = await db
    .select({
      id: courseEnrollments.id,
      status: courseEnrollments.status,
      message: courseEnrollments.message,
      createdAt: courseEnrollments.createdAt,
      courseId: courses.id,
      courseTitle: courses.title,
      courseFormat: courses.format,
      courseStatus: courses.status,
      subjectName: subjects.name,
      lastName: candidates.lastName,
      firstName: candidates.firstName,
      matricule: candidates.matricule,
      candidateSerie: candidates.serieCode,
      candidatePhone: candidates.phone,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .innerJoin(candidates, eq(candidates.id, courseEnrollments.candidateId))
    .where(and(eq(courses.teacherId, teacher.id), inArray(courseEnrollments.status, only)))
    .orderBy(desc(courseEnrollments.createdAt));

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Réservations"
        description="Les candidat·es qui réservez vos cours. Confirmez une réservation pour valider la place, ou refusez-la si le cours est complet ou le niveau ne correspond pas."
      />

      <div className="mb-4 flex gap-1 rounded-xl bg-sunken p-1">
        {[
          { value: "", label: "Toutes" },
          { value: "traiter", label: "À traiter" },
        ].map((t) => {
          const q = new URLSearchParams();
          if (t.value) q.set("statut", t.value);
          const on = (params.statut ?? "") === t.value;
          return (
            <a
              key={t.value || "all"}
              href={q.size ? `/enseignant/inscriptions?${q}` : "/enseignant/inscriptions"}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                on ? "bg-raised text-vert shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.value === "traiter" && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-soleil px-1.5 text-xs text-ink">{pendingCount}</span>
              )}
            </a>
          );
        })}
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucune réservation"
            description={
              params.statut === "traiter"
                ? "Toutes les réservations reçues ont été traitées."
                : "Ouvrez un cours aux réservations pour recevoir des demandes."
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Cours</th>
                <th>Message</th>
                <th>Reçue le</th>
                <th>Statut</th>
                <th className="text-right">Décision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = ENROLLMENT_STATUS[r.status];
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="font-bold">
                        {r.lastName} {r.firstName}
                      </span>
                      <span className="block text-xs text-muted">
                        <Mono>{r.matricule}</Mono> · série {r.candidateSerie}
                        {r.candidatePhone && ` · ${r.candidatePhone}`}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold">{r.courseTitle}</span>
                      <span className="block text-xs text-muted">
                        {r.subjectName} · {COURSE_FORMAT[r.courseFormat]} ·{" "}
                        {COURSE_STATUS[r.courseStatus].label}
                      </span>
                    </td>
                    <td className="max-w-xs text-sm text-muted">{r.message ?? "—"}</td>
                    <td className="text-sm whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </td>
                    <td>
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <ConfirmAction
                            action={decideEnrollment}
                            fields={{ id: String(r.id), decision: "confirm" }}
                            variant="primary"
                            size="sm"
                            icon={<Check className="size-4" />}
                            label="Confirmer"
                            title="Confirmer cette réservation ?"
                            description="La place est validée pour ce candidat."
                          />
                          <ConfirmAction
                            action={decideEnrollment}
                            fields={{ id: String(r.id), decision: "cancel" }}
                            variant="danger"
                            size="sm"
                            icon={<X className="size-4" />}
                            label="Refuser"
                            title="Refuser cette réservation ?"
                            description="Le candidat reçoit un refus et peut viser un autre cours."
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
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
