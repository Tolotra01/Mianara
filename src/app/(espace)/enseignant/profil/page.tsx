import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { ArrowLeft, UserCog } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { courses, teacherSubjects } from "@/db/schema-gestion";
import { requireTeacher } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilEnseignantPage() {
  const { user, teacher } = await requireTeacher();
  const db = requireDb();
  const [subjectList, links, [{ n: openCount }]] = await Promise.all([
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.name)),
    db
      .select({ subjectId: teacherSubjects.subjectId })
      .from(teacherSubjects)
      .where(eq(teacherSubjects.teacherId, teacher.id)),
    db
      .select({ n: count() })
      .from(courses)
      .where(eq(courses.teacherId, teacher.id)),
  ]);

  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Ces informations apparaissent sur vos cours. Les matières déclarées sont les seules que vous pouvez publier."
        back={{ href: "/enseignant", label: "Mes cours" }}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Matières déclarées"
          value={links.length}
          icon={UserCog}
          tone="brand"
          hint={subjectList
            .filter((s) => links.some((l) => l.subjectId === s.id))
            .map((s) => s.name)
            .join(", ") || "aucune"}
        />
        <StatCard label="Cours publiés" value={openCount} icon={UserCog} tone="soleil" />
        <StatCard
          label="Ville"
          value={teacher.city ?? "—"}
          icon={UserCog}
          tone="mena"
          hint={teacher.yearsExperience > 0 ? `${teacher.yearsExperience} an(s) d'expérience` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card title="Informations publiques">
          <ProfileForm
            subjects={subjectList}
            values={{
              city: teacher.city ?? "",
              phone: user.phone ?? "",
              bio: teacher.bio ?? "",
              yearsExperience: teacher.yearsExperience,
              subjectIds: links.map((l) => l.subjectId),
            }}
          />
        </Card>

        <Card title="Compte">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">Identifiant</dt>
              <dd className="font-mono font-semibold">{user.username}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">Nom</dt>
              <dd className="font-semibold">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">Rattachement</dt>
              <dd className="text-muted">Aucun : enseignant indépendant.</dd>
            </div>
          </dl>
          <a
            href="/compte"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-vert hover:underline"
          >
            <ArrowLeft className="size-4 rotate-180" /> Modifier mon mot de passe
          </a>
        </Card>
      </div>
    </>
  );
}
