import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { History } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import {
  Avatar,
  Card,
  DataTable,
  KeyValues,
  Mono,
  PageHeader,
  StatusBadge,
  buttonClass,
} from "@/components/app/ui";
import { requireDb } from "@/db";
import { auditLogs, candidates, examCenters, rooms } from "@/db/schema-gestion";
import { examSessions } from "@/db/schema";
import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/bac-rules";
import { actionLabel } from "@/lib/labels";
import { PHONE_INPUT } from "@/lib/phone";
import { changePassword, updateContact } from "./actions";
import { PasswordFields } from "./PasswordFields";

export const metadata: Metadata = { title: "Mon compte" };

/** Détails propre au candidat : le reste du dossier n'est pas modifiable ici. */
async function candidateProfile(userId: string) {
  return requireDb()
    .select({
      matricule: candidates.matricule,
      birthDate: candidates.birthDate,
      birthPlace: candidates.birthPlace,
      gender: candidates.gender,
      serieCode: candidates.serieCode,
      sessionYear: examSessions.year,
      centerName: examCenters.name,
      roomName: rooms.name,
    })
    .from(candidates)
    .leftJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .where(eq(candidates.userId, userId))
    .limit(1);
}

export default async function ComptePage() {
  const user = await requireUser(["admin", "office", "supervisor", "candidate", "school", "teacher"]);
  const db = requireDb();

  const [history, candidate] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(15),
    user.role === "candidate" ? candidateProfile(user.id) : Promise.resolve([]),
  ]);
  const c = candidate[0];

  // Champs d'identité propres à chaque rôle : ce que l'utilisateur reconnaît
  // comme étant « son » périmètre de travail.
  const roleItems = [
    ...(user.role === "admin"
      ? [{ label: "Périmètre", value: "Toutes les régions" }]
      : []),
    ...(["office", "supervisor", "candidate"].includes(user.role)
      ? [{ label: "Office du Bacc", value: user.officeName }]
      : []),
    ...(user.role === "school"
      ? [{ label: "Établissement", value: user.schoolName }]
      : []),
    ...(user.role === "teacher"
      ? [{ label: "Rattachement", value: "Aucun — enseignant libre" }]
      : []),
    ...(c
      ? [
          { label: "Matricule", value: <Mono>{c.matricule}</Mono> },
          { label: "Série", value: c.serieCode },
          { label: "Sexe", value: c.gender === "F" ? "Féminin" : "Masculin" },
          { label: "Session", value: c.sessionYear ? `Bacc ${c.sessionYear}` : null },
          { label: "Né(e) le", value: c.birthDate ? formatDate(c.birthDate) : null },
          { label: "Lieu de naissance", value: c.birthPlace },
          { label: "Centre", value: c.centerName },
          { label: "Salle", value: c.roomName },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Mon compte"
        description="Vos informations, votre mot de passe et vos dernières actions."
      />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={user.fullName} size={64} />
              <div className="min-w-0 flex-1">
                <p className="t-h2 truncate">{user.fullName}</p>
                <p className="truncate font-mono text-sm text-muted">{user.username}</p>
              </div>
              <StatusBadge tone="brand">{ROLE_LABEL[user.role]}</StatusBadge>
            </div>
            <KeyValues className="mt-6" items={roleItems} />
            {user.role === "candidate" && (
              <p className="mt-4 text-sm text-muted">
                Nom, date de naissance et série ne sont modifiables que par l&apos;Office du Bacc.
              </p>
            )}
          </Card>
          <Card title="Coordonnées" description="Pour recevoir les notifications par email et SMS.">
            <ActionForm action={updateContact} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="text-sm font-semibold">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  className="field-input mt-1.5"
                />
                <FieldError name="email" />
              </div>
              <div>
                <label htmlFor="phone" className="text-sm font-semibold">
                  Téléphone
                </label>
                <input
                  id="phone"
                  name="phone"
                  defaultValue={user.phone ?? ""}
                  placeholder="034 00 000 00"
                  className="field-input mt-1.5"
                  {...PHONE_INPUT}
                />
                <FieldError name="phone" />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton className={buttonClass("secondary")}>Enregistrer</SubmitButton>
              </div>
            </ActionForm>
          </Card>
          <Card
            title="Historique de mes actions"
            description="Chaque action est tracée (journal d'audit)."
            padded={false}
          >
            <DataTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Adresse IP</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(h.createdAt)}</td>
                    <td className="font-semibold">{actionLabel(h.action)}</td>
                    <td className="font-mono text-xs text-muted">{h.ip ?? "—"}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted">
                      <History className="mx-auto mb-2 size-6" /> Aucune action pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </DataTable>
          </Card>
        </div>
        <Card title="Mot de passe" className="self-start">
          <ActionForm action={changePassword} resetOnSuccess>
            <PasswordFields submitLabel="Changer le mot de passe" />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
