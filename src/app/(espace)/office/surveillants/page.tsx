import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { Building2, ClipboardCheck, DoorOpen, Power, ShieldCheck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import {
  Avatar,
  buttonClass,
  Card,
  EmptyState,
  Mono,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/app/ui";
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

  const roomsBySupervisor = new Map<string, Set<number>>();
  for (const l of links) {
    const set = roomsBySupervisor.get(l.supervisorId) ?? new Set<number>();
    set.add(l.roomId);
    roomsBySupervisor.set(l.supervisorId, set);
  }
  const totalAssignments = roomsBySupervisor.size
    ? [...roomsBySupervisor.values()].reduce((n, s) => n + s.size, 0)
    : 0;
  const activeCount = sups.filter((s) => s.isActive).length;
  const pendingCount = sups.filter((s) => s.isActive && s.mustChangePassword).length;

  // Les salles arrivent triées par centre puis par nom : on peut les regrouper
  // sans trier à nouveau, le nom du centre n'est ainsi écrit qu'une fois.
  const roomsByCenter = new Map<string, { id: number; name: string; center: string }[]>();
  for (const r of roomRows) {
    const group = roomsByCenter.get(r.center) ?? [];
    group.push(r);
    roomsByCenter.set(r.center, group);
  }

  return (
    <>
      <PageHeader
        eyebrow={user.officeName ?? "Office du Bacc"}
        title="Surveillants"
        description="Comptes des surveillants et salles dont ils contrôlent l'accès en scannant les convocations."
        actions={<SupervisorCreate />}
      />

      {sups.length > 0 && (
        <div className="stagger mb-6 grid gap-4 sm:grid-cols-3">
          <div style={{ "--i": 0 } as React.CSSProperties}>
            <StatCard
              label="Surveillants"
              value={sups.length}
              icon={ShieldCheck}
              tone="brand"
              hint={`${activeCount} actif${activeCount > 1 ? "s" : ""} sur ${sups.length}`}
            />
          </div>
          <div style={{ "--i": 1 } as React.CSSProperties}>
            <StatCard
              label="Salles à couvrir"
              value={roomRows.length}
              icon={DoorOpen}
              tone="soleil"
              hint={roomRows.length === 0 ? "Aucune salle créée" : "Disponibles pour affectation"}
            />
          </div>
          <div style={{ "--i": 2 } as React.CSSProperties}>
            <StatCard
              label="Affectations"
              value={totalAssignments}
              icon={ClipboardCheck}
              tone="mena"
              hint={
                pendingCount > 0
                  ? `${pendingCount} compte${pendingCount > 1 ? "s" : ""} à activer`
                  : "Tous les comptes sont activés"
              }
            />
          </div>
        </div>
      )}

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
            const mine = roomsBySupervisor.get(s.id) ?? new Set<number>();
            return (
              <section
                key={s.id}
                style={{ "--i": i } as React.CSSProperties}
                className="flex flex-col rounded-2xl border border-line bg-raised p-5 shadow-sm transition-all duration-200 hover:border-vert hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={s.fullName} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.fullName}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                      <Mono>{s.username}</Mono>
                      {s.phone && <span className="text-muted">· {s.phone}</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {s.lastLoginAt
                        ? `Dernière connexion ${formatDateTime(s.lastLoginAt)}`
                        : "Jamais connecté"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
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
                <ActionForm
                  action={assignSupervisor}
                  className="mt-4 flex flex-1 flex-col border-t border-line pt-4"
                >
                  <input type="hidden" name="supervisorId" value={s.id} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Salles surveillées</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                        mine.size > 0 ? "bg-vert-soft text-vert" : "bg-sunken text-muted"
                      }`}
                    >
                      {mine.size}/{roomRows.length}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2.5">
                    {[...roomsByCenter].map(([center, group]) => (
                      <div key={center}>
                        <p className="flex items-center gap-1 text-xs font-semibold text-muted">
                          <Building2 className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{center}</span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {group.map((r) => (
                            <label key={r.id} className="cursor-pointer">
                              <input
                                type="checkbox"
                                name="roomIds"
                                value={r.id}
                                defaultChecked={mine.has(r.id)}
                                className="peer sr-only"
                              />
                              <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-sm font-semibold transition-colors peer-checked:border-vert peer-checked:bg-vert-soft peer-checked:text-vert peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-ring)]">
                                <DoorOpen className="size-3.5 shrink-0" aria-hidden />
                                <span className="truncate">{r.name}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {roomRows.length === 0 && (
                      <span className="text-sm text-muted">Créez d&apos;abord des salles.</span>
                    )}
                  </div>
                  {roomRows.length > 0 && (
                    <SubmitButton className={`${buttonClass("secondary", "sm")} mt-3 self-start`}>
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
