import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Download, FileDown, Ticket } from "lucide-react";
import {
  Avatar,
  Card,
  DataTable,
  EmptyState,
  LinkButton,
  Mono,
  PageHeader,
  StatusBadge,
} from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidatePhotos, candidates, examCenters, rooms } from "@/db/schema-gestion";
import { requireSchool } from "@/lib/auth";
import { CANDIDATE_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Candidats convoqués" };

export default async function EcoleCandidatsPage() {
  const user = await requireSchool();
  const rows = await requireDb()
    .select({ c: candidates, center: examCenters.name, room: rooms.name, photo: candidatePhotos.candidateId })
    .from(candidates)
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .leftJoin(candidatePhotos, eq(candidatePhotos.candidateId, candidates.id))
    .where(eq(candidates.schoolId, user.schoolId))
    .orderBy(asc(candidates.lastName), asc(candidates.firstName));

  return (
    <>
      <PageHeader
        title="Candidats convoqués"
        description="Élèves dont le dossier a été validé : remettez-leur leur convocation, où figurent leurs identifiants."
        actions={
          rows.length > 0 && (
            <LinkButton href="/api/ecole/convocations" prefetch={false}>
              <FileDown className="size-5" /> Toutes les convocations (PDF)
            </LinkButton>
          )
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Aucun candidat convoqué"
            description="Les dossiers validés par l'Office apparaîtront ici avec leur convocation."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Matricule</th>
                <th>Série</th>
                <th>Centre · salle</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, center, room, photo }) => (
                <tr key={c.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <Avatar
                        name={`${c.firstName} ${c.lastName}`}
                        src={photo ? `/api/photos/${c.id}` : null}
                        size={36}
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
                  <td>
                    {room ? (
                      `${center} · ${room} · place ${c.seatNumber}`
                    ) : (
                      <StatusBadge tone="warning">Affectation en cours</StatusBadge>
                    )}
                  </td>
                  <td>
                    <StatusBadge tone={CANDIDATE_STATUS[c.status].tone}>
                      {CANDIDATE_STATUS[c.status].label}
                    </StatusBadge>
                  </td>
                  <td className="text-right">
                    <LinkButton
                      href={`/api/convocations/${c.id}?telecharger`}
                      variant="ghost"
                      size="sm"
                      prefetch={false}
                    >
                      <Download className="size-4" /> Convocation
                    </LinkButton>
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
