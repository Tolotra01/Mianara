import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { GraduationCap, Power } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { teacherList } from "@/lib/services/learning";
import { toggleTeacher } from "../apprentissage/actions";
import { TeacherDialog } from "../apprentissage/LearningForms";

export const metadata: Metadata = { title: "Enseignants" };

export default async function EnseignantsPage() {
  await requireUser(["admin"]);
  const [list, subjectList] = await Promise.all([
    teacherList(),
    requireDb().select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.name)),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Apprentissage"
        title="Enseignants"
        description="Les enseignants publient des cours, des exercices et des offres de tutorat pour l'application Mianara Mobile, et répondent aux élèves dans le chat."
        actions={<TeacherDialog subjects={subjectList} />}
      />
      <Card padded={false}>
        {list.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucun enseignant"
            description="Créez le premier compte enseignant."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Matière</th>
                <th>Contenus publiés</th>
                <th>Tutorats actifs</th>
                <th>Compte</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className={t.isActive ? "" : "opacity-60"}>
                  <td>
                    <span className="font-bold">{t.fullName}</span>
                    <span className="block text-xs text-muted">
                      {[t.email, t.phone].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>
                  <td>{t.subjectName}</td>
                  <td className="tabular-nums">{t.items}</td>
                  <td className="tabular-nums">{t.sessions}</td>
                  <td className="text-sm">
                    <Mono>{t.username}</Mono>
                    <span className="mt-1 block">
                      {!t.isActive ? (
                        <StatusBadge tone="neutral">Fermé</StatusBadge>
                      ) : t.firstLogin ? (
                        <StatusBadge tone="warning">1re connexion</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">Actif</StatusBadge>
                      )}
                    </span>
                  </td>
                  <td className="text-right">
                    <ConfirmAction
                      action={toggleTeacher}
                      fields={{ id: t.id }}
                      variant="ghost"
                      size="sm"
                      icon={<Power className="size-4" />}
                      label={<span className="sr-only">{t.isActive ? "Fermer" : "Réactiver"}</span>}
                      title={t.isActive ? `Fermer le compte de ${t.fullName} ?` : `Réactiver ${t.fullName} ?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
