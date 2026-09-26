import type { Metadata } from "next";
import { asc, count, eq, isNull, and, sql } from "drizzle-orm";
import { Building2, DoorOpen, MapPin, Shuffle, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Alert, Card, EmptyState, PageHeader, Progress } from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidates, examCenters, rooms, supervisorRooms, users } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { autoAssign } from "../candidats/actions";
import { deleteRoom } from "./actions";
import { NewCenterDialog, NewRoomDialog } from "./CenterDialogs";

export const metadata: Metadata = { title: "Centres et salles" };

export default async function CentresPage() {
  const user = await requireOffice();
  const db = requireDb();
  const [centers, roomRows, [{ waiting }], supervisors] = await Promise.all([
    db
      .select()
      .from(examCenters)
      .where(eq(examCenters.officeId, user.officeId))
      .orderBy(asc(examCenters.name)),
    db
      .select({
        id: rooms.id,
        centerId: rooms.centerId,
        name: rooms.name,
        capacity: rooms.capacity,
        used: sql<number>`(select count(*)::int from candidates c2 where c2.room_id = "rooms"."id")`,
      })
      .from(rooms)
      .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
      .where(eq(examCenters.officeId, user.officeId))
      .orderBy(asc(rooms.name)),
    db
      .select({ waiting: count() })
      .from(candidates)
      .where(and(eq(candidates.officeId, user.officeId), isNull(candidates.roomId))),
    db
      .select({ roomId: supervisorRooms.roomId, name: users.fullName })
      .from(supervisorRooms)
      .innerJoin(users, eq(users.id, supervisorRooms.supervisorId)),
  ]);
  const capacity = roomRows.reduce((s, r) => s + r.capacity, 0);
  const used = roomRows.reduce((s, r) => s + r.used, 0);

  return (
    <>
      <PageHeader
        title="Centres et salles"
        description="Les centres d'examen de votre Office, leurs salles et leur capacité."
        actions={
          <>
            <ConfirmAction
              action={autoAssign}
              variant="secondary"
              icon={<Shuffle className="size-5" />}
              label="Répartir les candidats"
              title="Répartir les candidats sans salle ?"
              description={`${waiting} candidat(s) seront placés dans les salles libres, par série puis par ordre alphabétique.`}
              confirmLabel="Répartir"
            />
            <NewCenterDialog />
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-raised p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Places occupées</p>
          <p className="mt-1 text-3xl font-extrabold">
            {used} <span className="text-lg text-muted">/ {capacity}</span>
          </p>
          <div className="mt-3">
            <Progress value={capacity ? (used / capacity) * 100 : 0} label="Taux d'occupation" />
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-raised p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted">Centres · salles</p>
          <p className="mt-1 text-3xl font-extrabold">
            {centers.length} · {roomRows.length}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-5 shadow-sm ${waiting ? "border-soleil bg-soleil-soft" : "border-line bg-raised"}`}
        >
          <p className="text-sm font-semibold text-muted">Candidats sans salle</p>
          <p className="mt-1 text-3xl font-extrabold">{waiting}</p>
        </div>
      </div>

      {waiting > capacity - used && (
        <div className="mb-6">
          <Alert tone="warning" title="Capacité insuffisante">
            Il manque {waiting - (capacity - used)} place(s) : ajoutez des salles avant de répartir.
          </Alert>
        </div>
      )}

      {centers.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="Aucun centre d'examen"
            description="Créez vos centres, puis leurs salles avec leur capacité."
          />
        </Card>
      ) : (
        <div className="stagger grid gap-6 lg:grid-cols-2">
          {centers.map((center, ci) => {
            const list = roomRows.filter((r) => r.centerId === center.id);
            return (
              <div key={center.id} style={{ "--i": ci } as React.CSSProperties}>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Building2 className="size-5 text-vert" /> {center.name}
                    </span>
                  }
                  description={
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {center.address ? `${center.address}, ` : ""}
                      {center.city}
                    </span>
                  }
                  actions={<NewRoomDialog centerId={center.id} centerName={center.name} />}
                >
                  {list.length === 0 ? (
                    <p className="text-sm text-muted">Aucune salle : ajoutez-en une.</p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {list.map((r) => {
                        const sups = supervisors.filter((s) => s.roomId === r.id).map((s) => s.name);
                        const full = r.used >= r.capacity;
                        return (
                          <li
                            key={r.id}
                            className="group rounded-xl border border-line p-4 transition-colors hover:border-vert"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex items-center gap-2 font-bold">
                                <DoorOpen className="size-4 text-muted" /> {r.name}
                              </span>
                              <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <ConfirmAction
                                  action={deleteRoom}
                                  fields={{ id: String(r.id) }}
                                  variant="ghost"
                                  size="sm"
                                  icon={<Trash2 className="size-4" />}
                                  label={<span className="sr-only">Supprimer</span>}
                                  title={`Supprimer ${r.name} ?`}
                                  description="Seule une salle vide peut être supprimée."
                                  confirmLabel="Supprimer"
                                />
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-muted">
                              {r.used} / {r.capacity} places {full && "· complète"}
                            </p>
                            <div className="mt-2">
                              <Progress value={(r.used / r.capacity) * 100} tone={full ? "mena" : "vert"} />
                            </div>
                            <p className="mt-2 truncate text-xs text-muted">
                              {sups.length
                                ? `Surveillance : ${sups.join(", ")}`
                                : "Aucun surveillant affecté"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
