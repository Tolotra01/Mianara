import type { Metadata } from "next";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { FilterTabs } from "@/components/app/Pagination";
import { SearchInput } from "@/components/app/SearchInput";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge, type Tone } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { teacherProfiles, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import {
  EditTeacherDialog,
  NewTeacherDialog,
  TeacherAccessAction,
  TeacherPasswordDialog,
  type TeacherRow,
  TeacherVerificationActions,
} from "./TeacherDialogs";

export const metadata: Metadata = { title: "Enseignants" };

const VERIFICATION: Record<TeacherRow["verificationStatus"], { label: string; tone: Tone }> = {
  pending: { label: "À vérifier", tone: "warning" },
  verified: { label: "Vérifié", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
};

const FILTERS = ["", "pending", "verified", "rejected", "inactive"] as const;

export default async function EnseignantsPage({ searchParams }: PageProps<"/admin/enseignants">) {
  await requireUser(["admin"]);
  const params = await searchParams;
  const status = FILTERS.find((f) => f === params.statut) ?? "";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const filters: SQL[] = [eq(users.role, "teacher")];
  if (status === "inactive") filters.push(eq(users.isActive, false));
  else if (status) filters.push(eq(teacherProfiles.verificationStatus, status), eq(users.isActive, true));
  if (q) filters.push(or(ilike(users.fullName, `%${q}%`), ilike(users.username, `%${q}%`))!);

  const db = requireDb();
  const [rows, subjectList, counts] = await Promise.all([
    db
      .select({
        user: users,
        profile: teacherProfiles,
        subject: subjects.name,
        documents: sql<string>`coalesce((select string_agg(d.kind::text || ':' || d.status::text, ',') from teacher_documents d where d.teacher_id = ${users.id}), '')`,
        listings: sql<number>`(select count(*)::int from learning_listings l where l.teacher_id = ${users.id})`,
        approved: sql<number>`(select count(*)::int from learning_listings l where l.teacher_id = ${users.id} and l.review_status = 'approved')`,
        sessions: sql<number>`(select count(*)::int from coaching_sessions s join learning_listings l on l.id = s.listing_id where l.teacher_id = ${users.id} and s.status = 'active')`,
      })
      .from(users)
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .innerJoin(subjects, eq(subjects.code, teacherProfiles.subjectCode))
      .where(and(...filters))
      .orderBy(asc(users.fullName)),
    db.select({ code: subjects.code, name: subjects.name }).from(subjects).orderBy(asc(subjects.name)),
    db
      .select({
        pending: sql<number>`count(*) filter (where ${teacherProfiles.verificationStatus} = 'pending' and ${users.isActive})::int`,
        verified: sql<number>`count(*) filter (where ${teacherProfiles.verificationStatus} = 'verified' and ${users.isActive})::int`,
        rejected: sql<number>`count(*) filter (where ${teacherProfiles.verificationStatus} = 'rejected' and ${users.isActive})::int`,
        inactive: sql<number>`count(*) filter (where not ${users.isActive})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(users)
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(users.role, "teacher")),
  ]);
  const [n] = counts;

  return (
    <>
      <PageHeader
        title="Enseignants"
        description="Comptes des enseignants qui proposent cours, formations et coaching. La validation des justificatifs, des offres et des paiements se fait dans « Offres et coaching »."
        actions={<NewTeacherDialog subjects={subjectList} />}
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="statut"
            active={status}
            params={params}
            basePath="/admin/enseignants"
            options={[
              { value: "", label: "Tous", count: n?.total ?? 0 },
              { value: "pending", label: "À vérifier", count: n?.pending ?? 0 },
              { value: "verified", label: "Vérifiés", count: n?.verified ?? 0 },
              { value: "rejected", label: "Refusés", count: n?.rejected ?? 0 },
              { value: "inactive", label: "Désactivés", count: n?.inactive ?? 0 },
            ]}
          />
          <SearchInput placeholder="Nom, identifiant…" />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucun enseignant"
            description="Les enseignants s'inscrivent depuis le site, ou vous créez leur compte ici."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Enseignant</th>
                <th>Matière</th>
                <th>Justificatifs</th>
                <th>Offres</th>
                <th>Vérification</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, profile, subject, documents, listings, approved, sessions }) => {
                const t: TeacherRow = {
                  id: user.id,
                  fullName: user.fullName,
                  username: user.username,
                  phone: user.phone,
                  email: user.email,
                  subjectCode: profile.subjectCode,
                  verificationStatus: profile.verificationStatus,
                  isActive: user.isActive,
                };
                const docs = Object.fromEntries(
                  documents
                    .split(",")
                    .filter(Boolean)
                    .map((d) => d.split(":") as [string, string]),
                );
                const v = VERIFICATION[profile.verificationStatus];
                return (
                  <tr key={user.id} className={user.isActive ? "" : "opacity-60"}>
                    <td>
                      <span className="font-bold">{user.fullName}</span>
                      <span className="block text-xs text-muted">
                        <Mono>{user.username}</Mono>
                        {!user.isActive
                          ? " · compte désactivé"
                          : user.mustChangePassword
                            ? " · 1re connexion à faire"
                            : ""}
                      </span>
                    </td>
                    <td>{subject}</td>
                    <td className="text-xs">
                      {(["identity", "qualification"] as const).map((kind) => (
                        <span key={kind} className="block">
                          {kind === "identity" ? "Identité" : "Diplôme"} :{" "}
                          {docs[kind] === "approved"
                            ? "approuvé"
                            : docs[kind] === "rejected"
                              ? "refusé"
                              : docs[kind] === "pending"
                                ? "à examiner"
                                : "non déposé"}
                        </span>
                      ))}
                    </td>
                    <td className="tabular-nums">
                      <span className="font-bold">{approved}</span>
                      <span className="text-muted"> / {listings}</span>
                      {sessions > 0 && (
                        <span className="block text-xs text-muted">{sessions} séance(s) active(s)</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <TeacherVerificationActions teacher={t} />
                        <EditTeacherDialog teacher={t} subjects={subjectList} />
                        <TeacherPasswordDialog teacher={t} />
                        <TeacherAccessAction teacher={t} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>
      <p className="mt-4 text-sm text-muted">
        Justificatifs, offres et paiements :{" "}
        <Link href="/admin/apprentissage" className="font-semibold text-vert underline">
          Offres et coaching
        </Link>
        .
      </p>
    </>
  );
}
