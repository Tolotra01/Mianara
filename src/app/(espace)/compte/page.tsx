import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { History } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { Card, DataTable, KeyValues, Mono, PageHeader, buttonClass } from "@/components/app/ui";
import { requireDb } from "@/db";
import { auditLogs } from "@/db/schema-gestion";
import { requireUser, ROLE_LABEL } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { actionLabel } from "@/lib/labels";
import { changePassword, updateContact } from "./actions";
import { PasswordFields } from "./PasswordFields";

export const metadata: Metadata = { title: "Mon compte" };

export default async function ComptePage() {
  const user = await requireUser(["admin", "office", "supervisor", "candidate", "teacher"]);
  const history = await requireDb()
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.actorId, user.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(15);

  return (
    <>
      <PageHeader
        title="Mon compte"
        description="Vos informations, votre mot de passe et vos dernières actions."
      />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card title="Identité">
            <KeyValues
              items={[
                { label: "Nom", value: user.fullName },
                { label: "Identifiant", value: <Mono>{user.username}</Mono> },
                { label: "Espace", value: ROLE_LABEL[user.role] },
                { label: "Office", value: user.officeName },
              ]}
            />
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
                  type="tel"
                  defaultValue={user.phone ?? ""}
                  placeholder="034 00 000 00"
                  className="field-input mt-1.5"
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
