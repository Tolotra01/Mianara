import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireDb } from "@/db";
import { candidates, coachingMessages, coachingPayments, coachingSessions, learningListings, teacherProfiles, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { sendTeacherCoachingMessage } from "./actions";

export const metadata: Metadata = { title: "Conversation de coaching" };
export default async function TeacherCoachingChat({ params }: PageProps<"/enseignant/sessions/[id]">) {
  const teacher = await requireUser(["teacher"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = requireDb();
  const [session] = await db.select({
    id: coachingSessions.id, title: learningListings.title, serie: candidates.serieCode,
  }).from(coachingSessions).innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
    .innerJoin(learningListings, eq(learningListings.id, coachingSessions.listingId))
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, learningListings.teacherId))
    .innerJoin(users, eq(users.id, learningListings.teacherId))
    .innerJoin(candidates, eq(candidates.id, coachingSessions.candidateId))
    .where(and(eq(coachingSessions.id, id), eq(learningListings.teacherId, teacher.id),
      eq(coachingSessions.status, "active"), eq(coachingPayments.status, "approved"),
      eq(learningListings.reviewStatus, "approved"), eq(teacherProfiles.verificationStatus, "verified"),
      eq(users.isActive, true))).limit(1);
  if (!session) notFound();
  const messages = await db.select({
    senderId: coachingMessages.senderId, text: coachingMessages.text, createdAt: coachingMessages.createdAt,
  }).from(coachingMessages).where(eq(coachingMessages.sessionId, id)).orderBy(asc(coachingMessages.createdAt));
  return <section className="mx-auto max-w-3xl">
    <Link href="/enseignant" className="text-sm font-bold text-vert underline">← Retour à l&apos;espace enseignant</Link>
    <h1 className="t-h1 mt-4">Coaching : {session.title}</h1>
    <p className="mt-1 text-sm text-muted">Candidat de série {session.serie}. Les noms et identifiants ne sont pas partagés.</p>
    <div aria-live="polite" className="mt-6 min-h-56 space-y-3 rounded-2xl border border-line bg-raised p-4">
      {messages.map((message, i) => <p key={`${message.createdAt.toISOString()}-${i}`} className={`max-w-[85%] rounded-xl p-3 ${message.senderId === teacher.id ? "ml-auto bg-vert-soft" : "bg-sunken"}`}>
        <span className="block text-xs font-bold">{message.senderId === teacher.id ? "Vous" : "Candidat"}</span>
        <span className="whitespace-pre-wrap">{message.text}</span>
        <time className="mt-1 block text-right text-xs text-muted">{message.createdAt.toLocaleString("fr-FR")}</time>
      </p>)}
      {!messages.length && <p className="text-muted">Début de la conversation anonyme.</p>}
    </div>
    <form action={sendTeacherCoachingMessage} className="mt-4 flex items-end gap-3">
      <input type="hidden" name="id" value={session.id} />
      <label className="flex-1 text-sm font-semibold">Message<textarea className="field-input mt-1" name="text" rows={3} minLength={1} maxLength={4000} required /></label>
      <button className="rounded-xl bg-vert px-4 py-3 font-bold text-on-vert">Envoyer</button>
    </form>
  </section>;
}
