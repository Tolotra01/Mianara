import type { Metadata } from "next";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Ban, CircleCheck, Download, KeyRound, Pencil, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { candidateQrText } from "@/lib/pdf/convocation";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import {
  Alert,
  Avatar,
  buttonClass,
  Card,
  DataTable,
  KeyValues,
  LinkButton,
  Mono,
  PageHeader,
  StatusBadge,
} from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions, serieSubjects, subjects } from "@/db/schema";
import {
  auditLogs,
  blacklist,
  candidatePhotos,
  candidates,
  documentRequests,
  examCenters,
  exams,
  grades,
  results,
  rooms,
  scans,
  schools,
  users,
} from "@/db/schema-gestion";
import { serieOptions } from "@/lib/candidate-input";
import { requireOffice } from "@/lib/auth";
import {
  DECISION_LABEL,
  formatDate,
  formatDateTime,
  formatDay,
  formatTime,
  MENTION_LABEL,
  scanState,
} from "@/lib/bac-rules";
import { decrypt } from "@/lib/crypto";
import { actionLabel, CANDIDATE_STATUS, DOC_LABEL, REQUEST_STATUS } from "@/lib/labels";
import { addToBlacklist } from "../../liste-noire/actions";
import { placeCandidate, reactivateAccount, resetPassword, updateCandidate } from "../actions";
import { CandidateForm } from "../CandidateForm";

export const metadata: Metadata = { title: "Fiche candidat" };

export default async function CandidatPage({ params, searchParams }: PageProps<"/office/candidats/[id]">) {
  const user = await requireOffice();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = requireDb();

  const [row] = await db
    .select({
      c: candidates,
      center: examCenters.name,
      room: rooms.name,
      session: examSessions,
      account: users,
    })
    .from(candidates)
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .leftJoin(users, eq(users.id, candidates.userId))
    .where(and(eq(candidates.id, id), eq(candidates.officeId, user.officeId)))
    .limit(1);
  if (!row) notFound();
  const { c, session, account } = row;

  const [photo, timetable, candidateScans, gradeRows, [result], requests, history, roomOptions, [black]] =
    await Promise.all([
      db
        .select({ id: candidatePhotos.candidateId })
        .from(candidatePhotos)
        .where(eq(candidatePhotos.candidateId, id)),
      db
        .select({ id: exams.id, subject: subjects.name, startsAt: exams.startsAt, endsAt: exams.endsAt })
        .from(exams)
        .innerJoin(subjects, eq(subjects.id, exams.subjectId))
        .where(and(eq(exams.sessionId, c.sessionId), eq(exams.serieCode, c.serieCode)))
        .orderBy(asc(exams.startsAt)),
      db.select().from(scans).where(eq(scans.candidateId, id)).orderBy(asc(scans.scannedAt)),
      db
        .select({ subject: subjects.name, coefficient: serieSubjects.coefficient, score: grades.score })
        .from(serieSubjects)
        .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId))
        .leftJoin(grades, and(eq(grades.subjectId, serieSubjects.subjectId), eq(grades.candidateId, id)))
        .where(eq(serieSubjects.serieCode, c.serieCode))
        .orderBy(sql`${subjects.code} = 'AUT'`, desc(serieSubjects.coefficient)),
      db.select().from(results).where(eq(results.candidateId, id)),
      db.select().from(documentRequests).where(eq(documentRequests.candidateId, id)),
      db
        .select({ id: auditLogs.id, action: auditLogs.action, at: auditLogs.createdAt, who: users.fullName })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorId))
        .where(sql`${auditLogs.recordId} = ${id} or (${auditLogs.actorId} = ${c.userId ?? id})`)
        .orderBy(desc(auditLogs.createdAt))
        .limit(12),
      db
        .select({
          id: rooms.id,
          name: rooms.name,
          center: examCenters.name,
          capacity: rooms.capacity,
          used: sql<number>`(select count(*)::int from candidates c2 where c2.room_id = "rooms"."id")`,
        })
        .from(rooms)
        .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
        .where(eq(examCenters.officeId, user.officeId))
        .orderBy(asc(examCenters.name), asc(rooms.name)),
      db
        .select()
        .from(blacklist)
        .where(and(eq(blacklist.candidateId, id), isNull(blacklist.liftedAt)))
        .limit(1),
    ]);

  const [serieList, schoolList] = await Promise.all([
    serieOptions(db),
    db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.officeId, user.officeId))
      .orderBy(asc(schools.name)),
  ]);
  const isNew = sp.nouveau === "1";
  const editing = sp.modifier === "1";
  const tempPassword = c.tempPasswordEnc ? decrypt(c.tempPasswordEnc) : null;
  const qr = await QRCode.toDataURL((await candidateQrText(id)) ?? c.qrToken, {
    margin: 2,
    width: 220,
    errorCorrectionLevel: "M",
  });
  const status = CANDIDATE_STATUS[c.status];
  const published = Boolean(session.resultsPublishAt && session.resultsPublishAt <= new Date());

  return (
    <>
      <PageHeader
        back={{ href: "/office/candidats", label: "Candidats" }}
        title={
          <span className="flex items-center gap-4">
            <Avatar
              name={`${c.firstName} ${c.lastName}`}
              src={photo.length ? `/api/photos/${id}` : null}
              size={56}
            />
            <span>
              {c.lastName} {c.firstName}
              <span className="mt-1 flex flex-wrap items-center gap-2 text-base font-normal">
                <Mono>{c.matricule}</Mono>
                <span className="rounded-md bg-sunken px-2 py-0.5 text-sm font-bold">
                  Série {c.serieCode}
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                {black && (
                  <StatusBadge tone="danger" icon={Ban}>
                    Liste noire
                  </StatusBadge>
                )}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/api/convocations/${id}`} target="_blank" variant="secondary" prefetch={false}>
              <Printer className="size-5" /> Imprimer
            </LinkButton>
            <LinkButton href={`/api/convocations/${id}?telecharger`} prefetch={false}>
              <Download className="size-5" /> Convocation PDF
            </LinkButton>
          </>
        }
      />

      {isNew && (
        <div className="anim-pop mb-6 overflow-hidden rounded-2xl border border-vert/30 bg-vert-soft">
          <div className="flex flex-wrap items-center gap-5 p-6">
            <span className="relative grid size-14 place-items-center rounded-full bg-vert text-on-vert">
              <span className="anim-ping absolute inset-0 rounded-full bg-vert/40" />
              <CircleCheck className="relative size-8" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="t-h2">Candidat enregistré, convocation générée</p>
              <p className="text-muted">
                Remettez la convocation au candidat : ses identifiants de connexion y figurent.
              </p>
            </div>
            <div className="rounded-xl bg-raised px-5 py-3 shadow-sm">
              <p className="text-xs font-bold text-muted uppercase">Identifiant</p>
              <Mono>{c.matricule}</Mono>
              <p className="mt-1.5 text-xs font-bold text-muted uppercase">Mot de passe temporaire</p>
              <Mono>{tempPassword ?? "—"}</Mono>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-vert/20 bg-raised/60 px-6 py-3">
            <LinkButton href={`/api/convocations/${id}?telecharger`} size="sm" prefetch={false}>
              <Download className="size-4" /> Télécharger la convocation
            </LinkButton>
            <LinkButton href="/office/candidats/nouveau" size="sm" variant="secondary">
              Enregistrer un autre candidat
            </LinkButton>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card
            title="Dossier"
            actions={
              editing ? (
                <Link href={`/office/candidats/${id}`} className={buttonClass("ghost", "sm")}>
                  Annuler
                </Link>
              ) : (
                <Link href={`/office/candidats/${id}?modifier=1`} className={buttonClass("secondary", "sm")}>
                  <Pencil className="size-4" /> Modifier
                </Link>
              )
            }
          >
            {editing ? (
              <CandidateForm
                action={updateCandidate}
                series={serieList}
                schools={schoolList}
                submitLabel="Enregistrer les modifications"
                values={{ ...c, photoUrl: photo.length ? `/api/photos/${id}` : null }}
              />
            ) : (
              <KeyValues
                items={[
                  { label: "Nom", value: c.lastName },
                  { label: "Prénoms", value: c.firstName },
                  { label: "Né(e) le", value: `${formatDate(c.birthDate)} à ${c.birthPlace}` },
                  { label: "Sexe", value: c.gender === "F" ? "Féminin" : "Masculin" },
                  { label: "Candidature", value: c.kind === "ecole" ? `D'école · ${c.schoolName}` : "Libre" },
                  { label: "Adresse", value: c.address },
                  { label: "CIN", value: c.cin, mono: true },
                  { label: "Téléphone", value: c.phone },
                  { label: "Email", value: c.email },
                  { label: "Enregistré le", value: formatDateTime(c.createdAt) },
                  {
                    label: "Dernière connexion",
                    value: account?.lastLoginAt ? formatDateTime(account.lastLoginAt) : "Jamais connecté",
                  },
                ]}
              />
            )}
          </Card>

          <Card
            title="Présence aux épreuves"
            description="Scans de la convocation par les surveillants."
            padded={false}
          >
            <DataTable>
              <thead>
                <tr>
                  <th>Épreuve</th>
                  <th>Date</th>
                  <th>Présence</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((e) => {
                  const own = candidateScans.filter((s) => s.examId === e.id);
                  const st = scanState(own.map((s) => s.type));
                  const past = e.endsAt < new Date();
                  const badge = st.fraud ? (
                    <StatusBadge tone="danger">Fraude</StatusBadge>
                  ) : st.ended ? (
                    <StatusBadge tone="success">Copie remise</StatusBadge>
                  ) : st.out ? (
                    <StatusBadge tone="warning">Sorti</StatusBadge>
                  ) : st.entered ? (
                    <StatusBadge tone="info">En salle</StatusBadge>
                  ) : past ? (
                    <StatusBadge tone="danger">Absent</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">À venir</StatusBadge>
                  );
                  return (
                    <tr key={e.id}>
                      <td className="font-semibold">{e.subject}</td>
                      <td className="text-muted first-letter:uppercase">
                        {formatDay(e.startsAt)} · {formatTime(e.startsAt)}
                      </td>
                      <td>{badge}</td>
                      <td className="text-xs text-muted">
                        {own.map((s) => `${formatTime(s.scannedAt)} ${s.type}`).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
                {timetable.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted">
                      Aucune épreuve au programme de la série {c.serieCode}.
                    </td>
                  </tr>
                )}
              </tbody>
            </DataTable>
          </Card>

          <Card title="Notes et résultat" padded={false}>
            <DataTable>
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Coef.</th>
                  <th>Note /20</th>
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((g) => (
                  <tr key={g.subject}>
                    <td className="font-semibold">{g.subject}</td>
                    <td className="tabular-nums">{g.coefficient}</td>
                    <td className={`font-bold tabular-nums ${g.score === 0 ? "text-danger" : ""}`}>
                      {g.score ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {result && (
              <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
                <span className="font-semibold">Délibération :</span>
                <StatusBadge
                  tone={
                    result.decision === "admitted"
                      ? "success"
                      : result.decision === "fraud"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {DECISION_LABEL[result.decision]}
                  {result.mention ? ` · ${MENTION_LABEL[result.mention]}` : ""}
                </StatusBadge>
                <span className="text-muted">Moyenne {result.average ?? "—"}/20</span>
                <span className="ml-auto text-sm text-muted">{published ? "Publié" : "Non publié"}</span>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Convocation">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="QR code de la convocation"
                className="size-32 rounded-lg border border-line bg-white p-1"
              />
              <div className="min-w-0 text-sm">
                <p className="font-bold">QR lisible et signé</p>
                <p className="text-muted">
                  Un lecteur QR ordinaire affiche l&apos;identité du candidat ; la signature Ed25519 est
                  vérifiée par l&apos;application de scan.
                </p>
                <p className="mt-3 text-xs font-bold text-muted uppercase">Mot de passe</p>
                <p className="font-semibold">
                  {tempPassword ? <Mono>{tempPassword}</Mono> : "Personnalisé par le candidat"}
                </p>
              </div>
            </div>
            <ActionForm action={placeCandidate} className="mt-5 flex items-end gap-2">
              <input type="hidden" name="id" value={id} />
              <label className="flex-1">
                <span className="text-sm font-semibold">Centre et salle</span>
                <select name="roomId" defaultValue={c.roomId ?? ""} className="field-input mt-1.5">
                  <option value="">Non placé</option>
                  {roomOptions.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.used >= r.capacity && r.id !== c.roomId}>
                      {r.center} · {r.name} ({r.used}/{r.capacity})
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton className={buttonClass("secondary")}>Placer</SubmitButton>
            </ActionForm>
            {c.seatNumber && (
              <p className="mt-2 text-sm text-muted">
                Actuellement : {row.center} · {row.room} · place n° {c.seatNumber}
              </p>
            )}
          </Card>

          <Card title="Compte du candidat">
            <div className="flex flex-wrap gap-2">
              <ConfirmAction
                action={resetPassword}
                fields={{ id }}
                variant="secondary"
                size="sm"
                icon={<KeyRound className="size-4" />}
                label="Nouveau mot de passe"
                title="Générer un nouveau mot de passe ?"
                description="L'ancien ne fonctionnera plus. Imprimez ensuite la nouvelle convocation pour le candidat."
                confirmLabel="Générer"
              />
              {(account && !account.isActive) ||
              c.status === "disabled" ||
              ["failed", "fraud"].includes(c.status) ? (
                <ConfirmAction
                  action={reactivateAccount}
                  fields={{ id }}
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw className="size-4" />}
                  label="Réactiver le compte"
                  title="Réactiver ce compte ?"
                  description="Le candidat pourra de nouveau se connecter."
                />
              ) : null}
              {!black && (
                <ConfirmAction
                  action={addToBlacklist}
                  fields={{ candidateId: id }}
                  variant="danger"
                  size="sm"
                  icon={<Ban className="size-4" />}
                  label="Liste noire"
                  title="Inscrire en liste noire"
                  description="Le candidat ne pourra plus demander de relevé ni de diplôme (RG-13)."
                  confirmLabel="Inscrire"
                >
                  <label className="block">
                    <span className="text-sm font-semibold">Motif</span>
                    <textarea
                      name="reason"
                      required
                      rows={3}
                      className="field-input mt-1.5"
                      placeholder="Fraude constatée, faux document…"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Jusqu&apos;au (vide = définitif)</span>
                    <input type="date" name="endsAt" className="field-input mt-1.5" />
                  </label>
                </ConfirmAction>
              )}
            </div>
            {black && (
              <div className="mt-4">
                <Alert tone="danger" title="Inscrit en liste noire">
                  {black.reason} {black.endsAt ? `(jusqu'au ${formatDate(black.endsAt)})` : "(définitif)"}
                </Alert>
              </div>
            )}
          </Card>

          <Card title="Demandes de documents">
            {requests.length === 0 ? (
              <p className="text-sm text-muted">Aucune demande de relevé ou de diplôme.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/office/demandes/${r.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 hover:border-vert"
                    >
                      <span>
                        <span className="block font-semibold">{DOC_LABEL[r.type]}</span>
                        <Mono>{r.number}</Mono>
                      </span>
                      <StatusBadge tone={REQUEST_STATUS[r.status].tone}>
                        {REQUEST_STATUS[r.status].label}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Historique">
            <ol className="relative space-y-4 border-l-2 border-line pl-5">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-raised bg-vert" />
                  <p className="text-sm font-semibold">{actionLabel(h.action)}</p>
                  <p className="text-xs text-muted">
                    {h.who ?? "Système"} · {formatDateTime(h.at)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
