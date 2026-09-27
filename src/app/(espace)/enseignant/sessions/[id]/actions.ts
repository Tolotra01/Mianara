"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb } from "@/db";
import { coachingPayments, coachingSessions, learningListings, teacherProfiles, users, coachingMessages } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

export async function sendTeacherCoachingMessage(form: FormData) {
  const teacher = await requireUser(["teacher"]);
  const parsed = z.object({ id: z.uuid(), text: z.string().trim().min(1).max(4000) })
    .safeParse({ id: form.get("id"), text: form.get("text") });
  if (!parsed.success) return;
  const db = requireDb();
  const [session] = await db.select({ id: coachingSessions.id })
    .from(coachingSessions).innerJoin(coachingPayments, eq(coachingPayments.id, coachingSessions.paymentId))
    .innerJoin(learningListings, eq(learningListings.id, coachingSessions.listingId))
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, learningListings.teacherId))
    .innerJoin(users, eq(users.id, learningListings.teacherId))
    .where(and(eq(coachingSessions.id, parsed.data.id), eq(learningListings.teacherId, teacher.id),
      eq(coachingSessions.status, "active"), eq(coachingPayments.status, "approved"),
      eq(learningListings.reviewStatus, "approved"), eq(teacherProfiles.verificationStatus, "verified"),
      eq(users.isActive, true))).limit(1);
  if (!session) return;
  const [message] = await db.insert(coachingMessages).values({
    sessionId: session.id, senderId: teacher.id, text: parsed.data.text,
  }).returning({ id: coachingMessages.id });
  await audit({ actorId: teacher.id, action: "coaching.message.envoye", table: "coaching_messages",
    recordId: message.id, newData: { sessionId: session.id } });
  refresh();
}
