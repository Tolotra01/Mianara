import { and, asc, eq } from "drizzle-orm";
import { requireDb, requireTxDb } from "@/db";
import { coachingMessages, coachingPayments, coachingSessions, learningListings, teacherProfiles, users } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getMobilePrincipal, hasOversizedBody, mobileJson, readJsonBody } from "@/lib/mobile-api";
import { coachingMessageInput, presentCoachingMessage } from "@/lib/learning-contract";

async function participant(request: Request, id: string) {
  const mobile = await getMobilePrincipal(request);
  if (mobile && !mobile.mustChangePassword)
    return { userId: mobile.userId, candidateId: mobile.candidateId, teacherId: null as string | null };
  const user = await getCurrentUser();
  if (user?.role === "teacher" && !user.mustChangePassword)
    return { userId: user.id, candidateId: null, teacherId: user.id };
  return null;
}

async function activeSession(id: string) {
  const [row] = await requireDb().select({
    id: coachingSessions.id, candidateId: coachingSessions.candidateId,
    teacherId: learningListings.teacherId, listingId: learningListings.id,
    subjectCode: learningListings.subjectCode,
  }).from(coachingSessions).innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
    .innerJoin(learningListings, eq(learningListings.id, coachingSessions.listingId))
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, learningListings.teacherId))
    .innerJoin(users, eq(users.id, learningListings.teacherId))
    .where(and(eq(coachingSessions.id, id), eq(coachingSessions.status, "active"),
      eq(coachingPayments.status, "approved"),
      eq(learningListings.reviewStatus, "approved"), eq(teacherProfiles.verificationStatus, "verified"),
      eq(users.isActive, true)))
    .limit(1);
  return row;
}

function senderRole(senderId: string, session: { teacherId: string }) {
  return senderId === session.teacherId ? "teacher" : "candidate";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const principal = await participant(request, id);
    if (!principal) return mobileJson({ error: "Session invalide." }, 401);
    const session = await activeSession(id);
    if (!session || (principal.candidateId && session.candidateId !== principal.candidateId)
      || (principal.teacherId && session.teacherId !== principal.teacherId)) {
      return mobileJson({ error: "Conversation introuvable ou paiement non validé." }, 404);
    }
    const rows = await requireDb().select({
      id: coachingMessages.id, senderId: coachingMessages.senderId, text: coachingMessages.text,
      createdAt: coachingMessages.createdAt,
    }).from(coachingMessages).where(eq(coachingMessages.sessionId, id)).orderBy(asc(coachingMessages.createdAt));
    return mobileJson({ messages: rows.map(({ senderId, ...message }) => presentCoachingMessage({
      ...message, sender: senderRole(senderId, session), createdAt: message.createdAt.toISOString(),
    })) });
  } catch (error) {
    console.error("Mobile coaching messages:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (Number(request.headers.get("content-length")) > 16_384) return mobileJson({ error: "Requête trop volumineuse." }, 413);
  try {
    const { id } = await params;
    const principal = await participant(request, id);
    if (!principal) return mobileJson({ error: "Session invalide." }, 401);
    const session = await activeSession(id);
    if (!session || (principal.candidateId && session.candidateId !== principal.candidateId)
      || (principal.teacherId && session.teacherId !== principal.teacherId)) {
      return mobileJson({ error: "Conversation introuvable ou paiement non validé." }, 404);
    }
    const body = await readJsonBody(request, 16_384);
    if (body.tooLarge) return mobileJson({ error: "Requête trop volumineuse." }, 413);
    const parsed = coachingMessageInput.safeParse(body.value);
    if (!parsed.success) return mobileJson({ error: "Message invalide." }, 400);
    const message = await requireTxDb().transaction(async (tx) => {
      const [created] = await tx.insert(coachingMessages).values({
        sessionId: id, senderId: principal.userId, text: parsed.data.text,
      }).returning({ id: coachingMessages.id, text: coachingMessages.text, createdAt: coachingMessages.createdAt });
      await audit({ actorId: principal.userId, action: "coaching.message.envoye", table: "coaching_messages",
        recordId: created.id, newData: { sessionId: id } }, tx);
      return created;
    });
    return mobileJson({ message: presentCoachingMessage({
      ...message, sender: principal.teacherId ? "teacher" : "candidate", createdAt: message.createdAt.toISOString(),
    }) });
  } catch (error) {
    console.error("Mobile coaching message:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
