import type { Metadata } from "next";
import { asc, eq, inArray } from "drizzle-orm";
import { DoorOpen, Smartphone } from "lucide-react";
import { Alert, Avatar, Card, DataTable, EmptyState, Mono, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidatePhotos, candidates, examCenters, rooms, supervisorRooms } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes salles" };

export default async function SurveillantPage() {
  const user = await requireUser(["supervisor"]);
  const db = requireDb();
  const myRooms = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      capacity: rooms.capacity,
      center: examCenters.name,
      city: examCenters.city,
    })
    .from(supervisorRooms)
    .innerJoin(rooms, eq(rooms.id, supervisorRooms.roomId))
    .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
    .where(eq(supervisorRooms.supervisorId, user.id))
    .orderBy(asc(examCenters.name), asc(rooms.name));
  const list = myRooms.length
    ? await db
        .select({ c: candidates, photo: candidatePhotos.candidateId })
        .from(candidates)
        .leftJoin(candidatePhotos, eq(candidatePhotos.candidateId, candidates.id))
        .where(
          inArray(
            candidates.roomId,
            myRooms.map((r) => r.id),
          ),
        )
        .orderBy(asc(candidates.seatNumber))
    : [];

  return (
    <>
      <PageHeader
        title="Mes salles"
        description="Les salles que vous surveillez et les candidats qui y sont convoqués."
      />
      <div className="mb-6">
        <Alert tone="info" title="Le contrôle se fait avec l'application mobile Mianara Scan">
          Entrée, sorties, retours, remise des copies et fraude : scannez le QR code de la convocation avec
          l&apos;application, même sans connexion. Utilisez les mêmes identifiants qu&apos;ici.
        </Alert>
      </div>
      {myRooms.length === 0 ? (
        <Card>
          <EmptyState
            icon={DoorOpen}
            title="Aucune salle attribuée"
            description="L'Office du Bac vous affectera à une ou plusieurs salles."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {myRooms.map((r) => {
            const inRoom = list.filter((x) => x.c.roomId === r.id);
            return (
              <Card
                key={r.id}
                title={
                  <span className="flex items-center gap-2">
                    <DoorOpen className="size-5 text-vert" /> {r.center} · {r.name}
                  </span>
                }
                description={`${r.city} · ${inRoom.length} candidat(s) sur ${r.capacity} places`}
                actions={
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                    <Smartphone className="size-4" /> Scan mobile
                  </span>
                }
                padded={false}
              >
                <DataTable>
                  <thead>
                    <tr>
                      <th>Place</th>
                      <th>Candidat</th>
                      <th>Matricule</th>
                      <th>Série</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inRoom.map(({ c, photo }) => (
                      <tr key={c.id}>
                        <td className="text-lg font-extrabold tabular-nums">{c.seatNumber}</td>
                        <td>
                          <span className="flex items-center gap-3">
                            <Avatar
                              name={`${c.firstName} ${c.lastName}`}
                              src={photo ? `/api/photos/${c.id}` : null}
                              size={40}
                            />
                            <span className="font-bold">
                              {c.lastName} {c.firstName}
                            </span>
                          </span>
                        </td>
                        <td>
                          <Mono>{c.matricule}</Mono>
                        </td>
                        <td className="font-bold">{c.serieCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
