import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { DoorOpen, Power, ShieldCheck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Avatar, buttonClass, Card, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examCenters, rooms, supervisorRooms, users } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { assignSupervisor, toggleSupervisor } from "./actions";
import { SupervisorCreate } from "./SupervisorCreate";

export const metadata: Metadata = { title: "Surveillants" };

export default async function SurveillantsPage() {
  const user = await requireOffice();
  const db = requireDb();
  const [sups, roomRows, links] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(eq(users.role, "supervisor"), eq(users.officeId, user.officeId)))
      .orderBy(asc(users.fullName)),
    db
      .select({ id: rooms.id, name: rooms.name, center: examCenters.name })
      .from(rooms)
      .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
      .where(eq(examCenters.officeId, user.officeId))
      .orderBy(asc(examCenters.name), asc(rooms.name)),
    db.select().from(supervisorRooms),
  ]);

  return (
    <>
      <PageHeader
        title="Surveillants"
        description="Comptes des surveillants et salles dont ils contrôlent l'accès en scannant les convocations."
        actions={<SupervisorCreate />}
      />
      {sups.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="Aucun surveillant"
            description="Créez un compte pour chaque surveillant, puis affectez-lui ses salles."
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-2">
          {sups.map((s, i) => {
            const mine = new Set(links.filter((l) => l.supervisorId === s.id).map((l) => l.roomId));
            return (
              <section
                key={s.id}
                style={{ "--i": i } as React.CSSProperties}
                className="rounded-2xl border border-line bg-raised p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={s.fullName} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{s.fullName}</p>
                    <p className="text-sm">
                      <Mono>{s.username}</Mono>
                      {s.phone && <span className="text-muted"> · {s.phone}</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {s.lastLoginAt
                        ? `Dernière connexion ${formatDateTime(s.lastLoginAt)}`
                        : "Jamais connecté"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {s.isActive ? (
                      s.mustChangePassword ? (
                        <StatusBadge tone="warning">1re connexion à faire</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">Actif</StatusBadge>
                      )
                    ) : (
                      <StatusBadge tone="neutral">Désactivé</StatusBadge>
                    )}
                    <ConfirmAction
                      action={toggleSupervisor}
                      fields={{ id: s.id }}
                      variant="ghost"
                      size="sm"
                      icon={<Power className="size-4" />}
                      label={s.isActive ? "Désactiver" : "Réactiver"}
                      title={s.isActive ? "Désactiver ce compte ?" : "Réactiver ce compte ?"}
                    />
                  </div>
                </div>
                <ActionForm action={assignSupervisor} className="mt-4 border-t border-line pt-4">
                  <input type="hidden" name="supervisorId" value={s.id} />
                  <p className="text-sm font-semibold">Salles surveillées</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roomRows.map((r) => (
                      <label key={r.id} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="roomIds"
                          value={r.id}
                          defaultChecked={mine.has(r.id)}
                          className="peer sr-only"
                        />
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm font-semibold transition-colors peer-checked:border-vert peer-checked:bg-vert-soft peer-checked:text-vert peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-ring)]">
                          <DoorOpen className="size-3.5" /> {r.center} · {r.name}
                        </span>
                      </label>
                    ))}
                    {roomRows.length === 0 && (
                      <span className="text-sm text-muted">Créez d&apos;abord des salles.</span>
                    )}
                  </div>
                  {roomRows.length > 0 && (
                    <SubmitButton className={`${buttonClass("secondary", "sm")} mt-3`}>
                      Enregistrer l&apos;affectation
                    </SubmitButton>
                  )}
                </ActionForm>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
