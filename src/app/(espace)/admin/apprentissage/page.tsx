import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Card, DataTable, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { requireDb } from "@/db";
import { candidates } from "@/db/schema-gestion";
import { coachingPaymentSettings, coachingPayments, learningListings, teacherDocuments, teacherProfiles, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { reviewCoachingPayment, reviewLearningListing, reviewTeacherDocument, saveCoachingMerchantNumber } from "./actions";

export const metadata: Metadata = { title: "Apprentissage — validation" };
const statusLabel: Record<string, string> = { pending: "En attente", approved: "Approuvé", rejected: "Refusé", verified: "Vérifié" };

export default async function AdminLearning() {
  await requireUser(["admin"]);
  const db = requireDb();
  const [docs, listings, payments, [paymentSettings]] = await Promise.all([
    db.select({ doc: teacherDocuments, username: users.username, fullName: users.fullName, subject: teacherProfiles.subjectCode })
      .from(teacherDocuments).innerJoin(users, eq(users.id, teacherDocuments.teacherId))
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id)).orderBy(desc(teacherDocuments.submittedAt)),
    db.select({ listing: learningListings, username: users.username, fullName: users.fullName })
      .from(learningListings).innerJoin(users, eq(users.id, learningListings.teacherId)).orderBy(desc(learningListings.createdAt)),
    db.select({ payment: coachingPayments, username: users.username, candidateSeries: candidates.serieCode, title: learningListings.title })
      .from(coachingPayments).innerJoin(candidates, eq(candidates.id, coachingPayments.candidateId))
      .innerJoin(learningListings, eq(learningListings.id, coachingPayments.listingId))
      .innerJoin(users, eq(users.id, learningListings.teacherId)).orderBy(desc(coachingPayments.createdAt)),
    db.select({ merchantNumber: coachingPaymentSettings.merchantNumber })
      .from(coachingPaymentSettings).limit(1),
  ]);
  const [profiles, docsForProfiles] = await Promise.all([
    db.select({ profile: teacherProfiles, username: users.username, fullName: users.fullName })
      .from(teacherProfiles).innerJoin(users, eq(users.id, teacherProfiles.userId)),
    db.select({ teacherId: teacherDocuments.teacherId, kind: teacherDocuments.kind, status: teacherDocuments.status })
      .from(teacherDocuments),
  ]);
  return <>
    <PageHeader title="Enseignants et apprentissage" description="Vérifiez les justificatifs, approuvez les offres et validez les paiements Orange Money avant l'ouverture du chat." />
    <Card title="Paiement Orange Money" description="Ce numéro sera communiqué aux candidats pour payer les séances de coaching.">
      <ActionForm action={saveCoachingMerchantNumber} className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-64 gap-1 text-sm font-semibold">Numéro marchand
          <input className="field-input" name="merchantNumber" type="tel" autoComplete="tel" minLength={5} maxLength={25} required defaultValue={paymentSettings?.merchantNumber ?? ""} placeholder="+261 34 00 000 00" />
          <FieldError name="merchantNumber" />
        </label>
        <SubmitButton className="rounded-xl bg-vert px-4 py-3 font-bold text-on-vert">Enregistrer</SubmitButton>
      </ActionForm>
    </Card>
    <Card title="Vérification des enseignants">
      {profiles.length ? <div className="space-y-5">{profiles.map(({ profile, username, fullName }) => <section key={profile.userId} className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap justify-between gap-2"><div><strong>{fullName}</strong><p className="text-sm text-muted">{username} · Matière {profile.subjectCode}</p></div>
          <StatusBadge tone={profile.verificationStatus === "verified" ? "success" : profile.verificationStatus === "rejected" ? "danger" : "warning"}>{statusLabel[profile.verificationStatus]}</StatusBadge></div>
        <div className="mt-3 flex flex-wrap gap-3">{docsForProfiles.filter((d) => d.teacherId === profile.userId).map((d) => {
          const doc = docs.find(({ doc: candidate }) => candidate.teacherId === d.teacherId && candidate.kind === d.kind)?.doc;
          return <div key={d.kind} className="rounded-lg bg-sunken p-3 text-sm">
            <p className="font-semibold">{d.kind === "identity" ? "Identité" : "Qualification"} · {statusLabel[d.status]}</p>
            {doc && <a className="text-vert underline" href={`/api/admin/teacher-documents/${doc.id}`}>Consulter le justificatif</a>}
            {d.status === "pending" && doc && <ActionForm action={reviewTeacherDocument} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={doc.id} /><SubmitButton name="decision" value="approve" className="rounded bg-vert px-3 py-1 text-on-vert">Approuver</SubmitButton>
              <SubmitButton name="decision" value="reject" className="rounded bg-danger-soft px-3 py-1 text-danger">Refuser</SubmitButton>
            </ActionForm>}
          </div>;
        })}</div>
      </section>)}</div> : <p className="text-muted">Aucun profil enseignant.</p>}
    </Card>
    <Card className="mt-6" title="Offres à examiner">
      {listings.filter(({ listing }) => listing.reviewStatus === "pending").length ? <div className="space-y-4">{listings.filter(({ listing }) => listing.reviewStatus === "pending").map(({ listing, fullName, username }) =>
        <ActionForm key={listing.id} action={reviewLearningListing} className="rounded-xl border border-line p-4">
          <input type="hidden" name="id" value={listing.id} /><h3 className="font-bold">{listing.title}</h3>
          <p className="text-sm text-muted">{fullName} ({username}) · {listing.kind} · {listing.subjectCode} · séries {listing.series.join(", ")}</p>
          <p className="mt-2">{listing.description}</p><details className="mt-2"><summary className="cursor-pointer font-semibold">Contenu</summary><p className="whitespace-pre-wrap">{listing.content}</p></details>
          <div className="mt-3 flex flex-wrap items-end gap-3"><label className="grid text-sm">Prix final MGA<input className="field-input" name="priceAmount" type="number" min="0" max="100000000" defaultValue={listing.priceAmount ?? ""} /><FieldError name="priceAmount" /></label>
            <label className="grid flex-1 text-sm">Note à l'enseignant<input className="field-input" name="note" maxLength={500} /></label>
            <SubmitButton name="decision" value="approve" className="rounded bg-vert px-4 py-2 font-bold text-on-vert">Approuver</SubmitButton>
            <SubmitButton name="decision" value="reject" className="rounded bg-danger-soft px-4 py-2 font-bold text-danger">Refuser</SubmitButton>
          </div>
        </ActionForm>)}</div> : <p className="text-muted">Aucune offre en attente.</p>}
      <details className="mt-5"><summary className="cursor-pointer font-semibold">Historique des offres</summary><DataTable><thead><tr><th>Offre</th><th>Enseignant</th><th>Prix MGA</th><th>Statut</th></tr></thead><tbody>{listings.filter(({ listing }) => listing.reviewStatus !== "pending").map(({ listing, username }) =>
        <tr key={listing.id}><td>{listing.title}</td><td>{username}</td><td>{listing.priceAmount ?? "—"}</td><td>{statusLabel[listing.reviewStatus]}</td></tr>)}</tbody></DataTable></details>
    </Card>
    <Card className="mt-6" title="Paiements de coaching">
      {payments.length ? <DataTable><thead><tr><th>Offre</th><th>Enseignant</th><th>Série du candidat</th><th>Référence Orange Money</th><th>Montant MGA</th><th>Statut / action</th></tr></thead><tbody>{payments.map(({ payment, username, candidateSeries, title }) =>
        <tr key={payment.id}><td>{title}</td><td>{username}</td><td>{candidateSeries}</td><td className="font-mono">{payment.transactionReference}</td><td>{payment.amount.toLocaleString("fr-FR")}</td><td>
          {payment.status === "pending" ? <ActionForm action={reviewCoachingPayment} className="flex gap-2"><input type="hidden" name="id" value={payment.id} />
            <SubmitButton name="decision" value="approve" className="rounded bg-vert px-3 py-1 text-on-vert">Valider</SubmitButton><SubmitButton name="decision" value="reject" className="rounded bg-danger-soft px-3 py-1 text-danger">Refuser</SubmitButton>
          </ActionForm> : <StatusBadge tone={payment.status === "approved" ? "success" : "danger"}>{statusLabel[payment.status]}</StatusBadge>}</td></tr>)}</tbody></DataTable> : <p className="text-muted">Aucun paiement déclaré.</p>}
    </Card>
  </>;
}
