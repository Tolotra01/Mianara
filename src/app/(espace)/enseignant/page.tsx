import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Card, DataTable, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { candidates, coachingPayments, coachingSessions, learningListings, teacherDocuments, teacherProfiles } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { SERIES } from "@/lib/learning";
import { submitLearningListing, submitTeacherProof } from "@/app/(vitrine)/enseignant/actions";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";

export const metadata: Metadata = { title: "Espace enseignant" };
const label = { pending: "En attente", approved: "Approuvé", rejected: "Refusé", verified: "Vérifié" };

export default async function TeacherWorkspace() {
  const user = await requireUser(["teacher"]);
  const db = requireDb();
  const [[profile], docs, listings, sessions, [subject]] = await Promise.all([
    db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, user.id)).limit(1),
    db.select().from(teacherDocuments).where(eq(teacherDocuments.teacherId, user.id)),
    db.select().from(learningListings).where(eq(learningListings.teacherId, user.id)).orderBy(desc(learningListings.createdAt)),
    db.select({
      id: coachingSessions.id, listing: learningListings.title, serie: candidates.serieCode,
      status: coachingSessions.status, payment: coachingPayments.status,
    }).from(coachingSessions).innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
      .innerJoin(learningListings, eq(learningListings.id, coachingSessions.listingId))
      .innerJoin(candidates, eq(candidates.id, coachingSessions.candidateId))
      .where(eq(learningListings.teacherId, user.id)).orderBy(desc(coachingSessions.createdAt)),
    profilePromise(db, user.id),
  ]);
  const proof = new Map(docs.map((doc) => [doc.kind, doc]));
  return <>
    <PageHeader title="Espace enseignant" description="Gérez vos justificatifs, offres et accompagnements. Votre compte est actif ; la validation admin est requise avant toute publication aux candidats." />
    <Card title="Profil et justificatifs" description={`Matière : ${subject?.name ?? profile?.subjectCode ?? "—"} · Vérification : ${label[profile?.verificationStatus ?? "pending"]}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["identity", "qualification"] as const).map((kind) => <div key={kind} className="rounded-xl border border-line p-4">
          <p className="font-bold">{kind === "identity" ? "Pièce d'identité" : "Diplôme ou qualification"}</p>
          <p className="mt-1 text-sm text-muted">{proof.get(kind) ? label[proof.get(kind)!.status] : "Non transmis"}</p>
          <ActionForm action={submitTeacherProof} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="kind" value={kind} />
            <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required className="max-w-full text-sm" />
            <SubmitButton className="rounded-lg bg-vert px-3 py-2 text-sm font-bold text-on-vert">Transmettre</SubmitButton>
            <p className="w-full text-xs text-muted">PDF, JPEG ou PNG, 3 Mo maximum. Conservé en accès restreint.</p>
          </ActionForm>
        </div>)}
      </div>
    </Card>
    <Card className="mt-6" title="Créer une offre" description="Les nouvelles offres sont soumises à l'approbation de l'administration. Elles ne sont pas visibles aux candidats avant la vérification de votre profil.">
      <ActionForm action={submitLearningListing} className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Type<select className="field-input" name="kind" required>
          <option value="course">Cours</option><option value="training">Formation</option><option value="coaching">Coaching</option>
        </select></label>
        <label className="grid gap-1 text-sm font-semibold">Prix (MGA; vide = gratuit)<input className="field-input" type="number" min="0" max="100000000" name="priceAmount" /></label>
        <label className="grid gap-1 text-sm font-semibold md:col-span-2">Séries concernées
          <select className="field-input min-h-28" name="series" multiple required>{SERIES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Titre<input className="field-input" name="title" minLength={4} maxLength={120} required /></label>
        <label className="grid gap-1 text-sm font-semibold">Durée en minutes (facultatif)<input className="field-input" type="number" min="1" max="6000" name="durationMinutes" /></label>
        <label className="grid gap-1 text-sm font-semibold md:col-span-2">Description<input className="field-input" name="description" minLength={10} maxLength={500} required /></label>
        <label className="grid gap-1 text-sm font-semibold md:col-span-2">Contenu<textarea className="field-input" name="content" rows={7} minLength={10} maxLength={20000} required /></label>
        <div className="md:col-span-2"><SubmitButton className="rounded-xl bg-vert px-4 py-3 font-bold text-on-vert">Soumettre pour validation</SubmitButton></div>
      </ActionForm>
    </Card>
    <Card className="mt-6" title="Mes offres">
      {listings.length ? <DataTable><thead><tr><th>Offre</th><th>Séries</th><th>Prix</th><th>Validation</th><th>Note admin</th></tr></thead><tbody>
        {listings.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><span className="block text-xs text-muted">{item.kind} · {item.subjectCode}</span></td>
          <td>{item.series.join(", ")}</td><td>{item.priceAmount === null ? "Gratuit" : `${item.priceAmount.toLocaleString("fr-FR")} MGA`}</td>
          <td><StatusBadge tone={item.reviewStatus === "approved" ? "success" : item.reviewStatus === "rejected" ? "danger" : "warning"}>{label[item.reviewStatus]}</StatusBadge></td><td>{item.reviewNote ?? "—"}</td></tr>)}
      </tbody></DataTable> : <p className="text-muted">Aucune offre soumise.</p>}
    </Card>
    <Card className="mt-6" title="Demandes de coaching">
      {sessions.length ? <DataTable><thead><tr><th>Offre</th><th>Série du candidat</th><th>Paiement</th><th>Chat</th></tr></thead><tbody>
        {sessions.map((s) => <tr key={s.id}><td>{s.listing}</td><td>{s.serie ?? "—"}</td><td>{label[s.payment]}</td>
          <td>{s.status === "active" ? <a className="font-bold text-vert underline" href={`/enseignant/sessions/${s.id}`}>Ouvrir le chat</a> : "Après validation du paiement"}</td></tr>)}
      </tbody></DataTable> : <p className="text-muted">Aucune demande reçue.</p>}
      <p className="mt-2 text-xs text-muted">Les noms et identifiants des candidats ne sont jamais affichés.</p>
    </Card>
  </>;
}

async function profilePromise(db: ReturnType<typeof requireDb>, userId: string) {
  const [profile] = await db.select({ subjectCode: teacherProfiles.subjectCode }).from(teacherProfiles)
    .where(eq(teacherProfiles.userId, userId)).limit(1);
  if (!profile) return [{ name: undefined }] as const;
  return db.select({ name: subjects.name }).from(subjects).where(eq(subjects.code, profile.subjectCode)).limit(1);
}
