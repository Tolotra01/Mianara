import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions, serieSubjects, series, subjects } from "@/db/schema";
import { candidates, examCenters, rooms, users } from "@/db/schema-gestion";
import {
  coachingMessages,
  coachingSessions,
  learningItems,
  learningPayments,
  platformSettings,
  revisionSessions,
  teachers,
} from "@/db/schema-learning";
import { audit, type Executor, notify } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

export const MERCHANT_KEY = "orange_money_merchant";

export const KIND_LABEL: Record<string, string> = {
  course: "Cours",
  training: "Exercices",
  coaching: "Tutorat",
};

export const ITEM_STATUS: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }
> = {
  draft: { label: "Brouillon", tone: "neutral" },
  submitted: { label: "En attente de validation", tone: "info" },
  approved: { label: "Publié", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
  archived: { label: "Archivé", tone: "neutral" },
};

export const PAY_STATUS: Record<string, { label: string; tone: "info" | "success" | "danger" }> = {
  pending: { label: "À vérifier", tone: "info" },
  approved: { label: "Validé", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
};

/* ---------- Réglages ---------- */

export async function getSetting(key: string, exec: Executor = requireDb()) {
  const [row] = await exec.select().from(platformSettings).where(eq(platformSettings.key, key));
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null, actorId: string) {
  await requireDb()
    .insert(platformSettings)
    .values({ key, value, updatedBy: actorId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedBy: actorId, updatedAt: new Date() },
    });
}

/* ---------- Profils ---------- */

/** Pseudonyme d'un élève vu par l'enseignant : jamais son nom (anonymat du tutorat). */
export const pupilAlias = (userId: string, serie: string | null) =>
  `Élève ${serie ? `série ${serie} ` : ""}· n° ${sha256(`tutorat:${userId}`).slice(0, 5).toUpperCase()}`;

export async function candidateProfile(userId: string) {
  const [c] = await requireDb()
    .select({
      id: candidates.id,
      matricule: candidates.matricule,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      serieCode: candidates.serieCode,
      serieName: series.name,
      kind: candidates.kind,
      schoolName: candidates.schoolName,
      status: candidates.status,
      center: examCenters.name,
      city: examCenters.city,
      room: rooms.name,
      seat: candidates.seatNumber,
      sessionYear: examSessions.year,
    })
    .from(candidates)
    .innerJoin(series, eq(series.code, candidates.serieCode))
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .where(eq(candidates.userId, userId))
    .limit(1);
  return c ?? null;
}

export async function teacherProfile(userId: string) {
  const [t] = await requireDb()
    .select({
      subjectId: teachers.subjectId,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      bio: teachers.bio,
    })
    .from(teachers)
    .innerJoin(subjects, eq(subjects.id, teachers.subjectId))
    .where(eq(teachers.userId, userId));
  return t ?? null;
}

/** Matières de la série du candidat (catalogue de l'application). */
export async function serieSubjectList(serieCode: string) {
  return requireDb()
    .select({ id: subjects.id, code: subjects.code, name: subjects.name, nameMg: subjects.nameMg })
    .from(serieSubjects)
    .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId))
    .where(eq(serieSubjects.serieCode, serieCode))
    .orderBy(desc(serieSubjects.coefficient));
}

/* ---------- Catalogue ---------- */

const isFree = (price: number | null) => !price || price <= 0;

/** Contenus publiés pour la série du candidat, avec l'état d'achat. Le texte n'est livré qu'une fois acquis. */
export async function catalogFor(userId: string, serieCode: string) {
  const db = requireDb();
  const subs = await serieSubjectList(serieCode);
  const ids = subs.map((s) => s.id);
  if (!ids.length) return [];
  const [items, payments, sessions] = await Promise.all([
    db
      .select({ i: learningItems, subjectCode: subjects.code, subjectName: subjects.name })
      .from(learningItems)
      .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
      .where(and(eq(learningItems.status, "approved"), inArray(learningItems.subjectId, ids)))
      .orderBy(asc(learningItems.kind), desc(learningItems.reviewedAt)),
    db
      .select({
        itemId: learningPayments.itemId,
        status: learningPayments.status,
        at: learningPayments.createdAt,
      })
      .from(learningPayments)
      .where(eq(learningPayments.userId, userId))
      .orderBy(desc(learningPayments.createdAt)),
    db
      .select({ itemId: coachingSessions.itemId, status: coachingSessions.status })
      .from(coachingSessions)
      .where(eq(coachingSessions.candidateUserId, userId)),
  ]);
  return items.map(({ i, subjectCode, subjectName }) => {
    const last = payments.find((p) => p.itemId === i.id);
    const purchased =
      i.kind === "coaching"
        ? sessions.some((s) => s.itemId === i.id && s.status === "active")
        : isFree(i.priceAmount) || payments.some((p) => p.itemId === i.id && p.status === "approved");
    return {
      id: i.id,
      kind: i.kind,
      subjectCode,
      subjectName,
      title: i.title,
      description: i.description,
      content: purchased ? i.content : "",
      priceAmount: isFree(i.priceAmount) ? null : i.priceAmount,
      currency: "MGA" as const,
      durationMinutes: i.durationMinutes,
      purchased,
      paymentStatus: last?.status ?? null,
    };
  });
}

/* ---------- Paiements ---------- */

export const REFERENCE_RE = /^[A-Za-z0-9][A-Za-z0-9.\-/]{5,39}$/;

/** Le candidat déclare sa référence Orange Money ; le coaching ouvre une séance en attente de paiement. */
export async function submitPayment(userId: string, serieCode: string, itemId: string, reference: string) {
  const db = requireDb();
  const ref = reference.trim().toUpperCase();
  if (!REFERENCE_RE.test(ref)) return { error: "Référence de transaction invalide." } as const;
  if (!(await getSetting(MERCHANT_KEY))) return { error: "Le paiement n'est pas encore ouvert." } as const;
  const [item] = await db
    .select({ i: learningItems })
    .from(learningItems)
    .innerJoin(serieSubjects, eq(serieSubjects.subjectId, learningItems.subjectId))
    .where(
      and(
        eq(learningItems.id, itemId),
        eq(learningItems.status, "approved"),
        eq(serieSubjects.serieCode, serieCode),
      ),
    );
  if (!item) return { error: "Contenu introuvable." } as const;
  if (isFree(item.i.priceAmount)) return { error: "Ce contenu est gratuit." } as const;
  const [dup] = await db
    .select({ id: learningPayments.id })
    .from(learningPayments)
    .where(eq(learningPayments.reference, ref));
  if (dup) return { error: "Cette référence de transaction a déjà été utilisée." } as const;
  const [pending] = await db
    .select({ id: learningPayments.id })
    .from(learningPayments)
    .where(
      and(
        eq(learningPayments.userId, userId),
        eq(learningPayments.itemId, itemId),
        eq(learningPayments.status, "pending"),
      ),
    );
  if (pending) return { error: "Un paiement est déjà en cours de vérification pour ce contenu." } as const;
  if (item.i.kind === "coaching") {
    const [active] = await db
      .select({ id: coachingSessions.id })
      .from(coachingSessions)
      .where(
        and(
          eq(coachingSessions.candidateUserId, userId),
          eq(coachingSessions.itemId, itemId),
          eq(coachingSessions.status, "active"),
        ),
      );
    if (active) return { error: "Votre séance de tutorat est déjà active." } as const;
  } else {
    const [paid] = await db
      .select({ id: learningPayments.id })
      .from(learningPayments)
      .where(
        and(
          eq(learningPayments.userId, userId),
          eq(learningPayments.itemId, itemId),
          eq(learningPayments.status, "approved"),
        ),
      );
    if (paid) return { error: "Vous avez déjà accès à ce contenu." } as const;
  }

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(learningPayments)
      .values({ itemId, userId, reference: ref, amount: item.i.priceAmount! })
      .returning();
    let sessionId: string | null = null;
    if (item.i.kind === "coaching") {
      const [s] = await tx
        .insert(coachingSessions)
        .values({ itemId, candidateUserId: userId, teacherId: item.i.authorId, paymentId: payment.id })
        .returning({ id: coachingSessions.id });
      sessionId = s.id;
    }
    await audit(
      {
        actorId: userId,
        action: "apprentissage.paiement",
        table: "learning_payments",
        recordId: payment.id,
        newData: { itemId, reference: ref },
      },
      tx,
    );
    return {
      payment: { id: payment.id, status: payment.status, amount: payment.amount },
      sessionId,
    } as const;
  });
}

/** Décision de l'Admin sur un paiement : l'accès (ou la séance de tutorat) s'ouvre à la validation. */
export async function reviewPayment(
  paymentId: string,
  approve: boolean,
  note: string | null,
  actorId: string,
) {
  const db = requireDb();
  const [row] = await db
    .select({
      p: learningPayments,
      title: learningItems.title,
      kind: learningItems.kind,
      teacherId: learningItems.authorId,
    })
    .from(learningPayments)
    .innerJoin(learningItems, eq(learningItems.id, learningPayments.itemId))
    .where(eq(learningPayments.id, paymentId));
  if (!row) return { error: "Paiement introuvable." } as const;
  if (row.p.status !== "pending") return { error: "Ce paiement a déjà été traité." } as const;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(learningPayments)
      .set({ status: approve ? "approved" : "rejected", note, reviewedBy: actorId, reviewedAt: now })
      .where(eq(learningPayments.id, paymentId));
    if (row.kind === "coaching")
      await tx
        .update(coachingSessions)
        .set(approve ? { status: "active", activatedAt: now } : { status: "closed", closedAt: now })
        .where(eq(coachingSessions.paymentId, paymentId));
    await audit(
      {
        actorId,
        action: approve ? "apprentissage.paiement_valide" : "apprentissage.paiement_refuse",
        table: "learning_payments",
        recordId: paymentId,
        newData: { note },
      },
      tx,
    );
    await notify(
      row.p.userId,
      approve
        ? {
            title: row.kind === "coaching" ? "Tutorat ouvert" : "Contenu débloqué",
            body:
              row.kind === "coaching"
                ? `Votre paiement est validé : le chat avec votre tuteur est ouvert (${row.title}).`
                : `Votre paiement est validé : « ${row.title} » est disponible dans l'application.`,
          }
        : { title: "Paiement refusé", body: `« ${row.title} » : ${note || "référence introuvable."}` },
      tx,
    );
    if (approve && row.kind === "coaching")
      await notify(
        row.teacherId,
        {
          title: "Nouvel élève en tutorat",
          body: `Une séance « ${row.title} » vient de s'ouvrir.`,
          link: "/enseignant/tutorat",
        },
        tx,
      );
  });
  return { ok: true } as const;
}

/* ---------- Tutorat ---------- */

export async function candidateSessions(userId: string) {
  return requireDb()
    .select({
      id: coachingSessions.id,
      listingId: coachingSessions.itemId,
      subjectCode: subjects.code,
      teacherSubject: subjects.name,
      title: learningItems.title,
      status: coachingSessions.status,
      unread: sql<number>`(select count(*)::int from coaching_messages m where m.session_id = ${coachingSessions.id} and m.sender = 'teacher' and m.read_at is null)`,
      lastAt: sql<Date | null>`(select max(m.created_at) from coaching_messages m where m.session_id = ${coachingSessions.id})`,
    })
    .from(coachingSessions)
    .innerJoin(learningItems, eq(learningItems.id, coachingSessions.itemId))
    .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
    .where(eq(coachingSessions.candidateUserId, userId))
    .orderBy(desc(coachingSessions.createdAt));
}

export async function teacherSessions(teacherId: string) {
  const rows = await requireDb()
    .select({
      id: coachingSessions.id,
      candidateUserId: coachingSessions.candidateUserId,
      serie: candidates.serieCode,
      title: learningItems.title,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      status: coachingSessions.status,
      activatedAt: coachingSessions.activatedAt,
      createdAt: coachingSessions.createdAt,
      unread: sql<number>`(select count(*)::int from coaching_messages m where m.session_id = ${coachingSessions.id} and m.sender = 'candidate' and m.read_at is null)`,
      lastText: sql<
        string | null
      >`(select m.text from coaching_messages m where m.session_id = ${coachingSessions.id} order by m.created_at desc limit 1)`,
      lastAt: sql<Date | null>`(select max(m.created_at) from coaching_messages m where m.session_id = ${coachingSessions.id})`,
    })
    .from(coachingSessions)
    .innerJoin(learningItems, eq(learningItems.id, coachingSessions.itemId))
    .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
    .leftJoin(candidates, eq(candidates.userId, coachingSessions.candidateUserId))
    .where(
      and(eq(coachingSessions.teacherId, teacherId), sql`${coachingSessions.status} <> 'pending_payment'`),
    )
    .orderBy(
      sql`${coachingSessions.status} = 'closed'`,
      desc(
        sql`coalesce((select max(m.created_at) from coaching_messages m where m.session_id = ${coachingSessions.id}), ${coachingSessions.activatedAt})`,
      ),
    );
  return rows.map(({ candidateUserId, ...r }) => ({ ...r, pupil: pupilAlias(candidateUserId, r.serie) }));
}

/** Séance accessible à cet utilisateur (élève ou enseignant de la séance), avec son rôle dans le chat. */
export async function sessionFor(sessionId: string, user: { id: string; role: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const [s] = await requireDb()
    .select({
      s: coachingSessions,
      title: learningItems.title,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      serie: candidates.serieCode,
    })
    .from(coachingSessions)
    .innerJoin(learningItems, eq(learningItems.id, coachingSessions.itemId))
    .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
    .leftJoin(candidates, eq(candidates.userId, coachingSessions.candidateUserId))
    .where(eq(coachingSessions.id, sessionId));
  if (!s) return null;
  const side =
    user.role === "candidate" && s.s.candidateUserId === user.id
      ? ("candidate" as const)
      : user.role === "teacher" && s.s.teacherId === user.id
        ? ("teacher" as const)
        : null;
  if (!side) return null;
  return { ...s, side, pupil: pupilAlias(s.s.candidateUserId, s.serie) };
}

/** Messages d'une séance ; ceux de l'autre partie deviennent lus. */
export async function sessionMessages(sessionId: string, side: "candidate" | "teacher") {
  const db = requireDb();
  const other = side === "candidate" ? "teacher" : "candidate";
  await db
    .update(coachingMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(coachingMessages.sessionId, sessionId),
        eq(coachingMessages.sender, other),
        isNull(coachingMessages.readAt),
      ),
    );
  const rows = await db
    .select({
      id: coachingMessages.id,
      sender: coachingMessages.sender,
      text: coachingMessages.text,
      createdAt: coachingMessages.createdAt,
    })
    .from(coachingMessages)
    .where(eq(coachingMessages.sessionId, sessionId))
    .orderBy(asc(coachingMessages.createdAt))
    .limit(500);
  return rows.map((m) => ({
    id: String(m.id),
    sender: m.sender,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function postMessage(
  session: NonNullable<Awaited<ReturnType<typeof sessionFor>>>,
  authorId: string,
  text: string,
) {
  const body = text.trim();
  if (!body) return { error: "Message vide." } as const;
  if (body.length > 2000) return { error: "Message trop long (2 000 caractères au plus)." } as const;
  if (session.s.status !== "active") return { error: "Cette séance de tutorat n'est pas ouverte." } as const;
  const db = requireDb();
  const [m] = await db
    .insert(coachingMessages)
    .values({ sessionId: session.s.id, sender: session.side, authorId, text: body })
    .returning();
  // Prévenir l'autre partie au premier message non lu seulement (pas une notification par message).
  const other = session.side === "candidate" ? session.s.teacherId : session.s.candidateUserId;
  const [{ n }] = await db
    .select({ n: count() })
    .from(coachingMessages)
    .where(
      and(
        eq(coachingMessages.sessionId, session.s.id),
        eq(coachingMessages.sender, session.side),
        isNull(coachingMessages.readAt),
      ),
    );
  if (n === 1)
    await notify(
      other,
      session.side === "candidate"
        ? {
            title: "Nouveau message d'un élève",
            body: `${session.pupil} · ${session.title}`,
            link: `/enseignant/tutorat/${session.s.id}`,
          }
        : { title: "Réponse de votre tuteur", body: `${session.subjectName} · ${session.title}` },
    );
  return {
    message: { id: String(m.id), sender: m.sender, text: m.text, createdAt: m.createdAt.toISOString() },
  } as const;
}

export async function closeSession(sessionId: string, teacherId: string) {
  const db = requireDb();
  const [s] = await db
    .update(coachingSessions)
    .set({ status: "closed", closedAt: new Date() })
    .where(
      and(
        eq(coachingSessions.id, sessionId),
        eq(coachingSessions.teacherId, teacherId),
        eq(coachingSessions.status, "active"),
      ),
    )
    .returning();
  if (!s) return { error: "Séance introuvable ou déjà close." } as const;
  await notify(s.candidateUserId, {
    title: "Séance de tutorat terminée",
    body: "Votre tuteur a clôturé la séance. Merci !",
  });
  await audit({ actorId: teacherId, action: "tutorat.cloturer", table: "coaching_sessions", recordId: s.id });
  return { ok: true } as const;
}

/* ---------- Révisions ---------- */

type Revision = { id: string; subject: string; startedAt: string; endedAt: string; progress?: number | null };

/** File de révisions du téléphone : idempotente (même identifiant = déjà reçue). */
export async function ingestRevisions(userId: string, list: Revision[]) {
  const db = requireDb();
  const accepted: string[] = [];
  for (const r of list) {
    const start = new Date(r.startedAt);
    const end = new Date(r.endedAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) continue;
    if (end.getTime() - start.getTime() > 12 * 3600 * 1000) continue;
    await db
      .insert(revisionSessions)
      .values({
        id: r.id,
        userId,
        subjectCode: r.subject.slice(0, 20),
        startedAt: start,
        endedAt: end,
        progress: r.progress ?? null,
      })
      .onConflictDoNothing();
    const [mine] = await db
      .select({ userId: revisionSessions.userId })
      .from(revisionSessions)
      .where(eq(revisionSessions.id, r.id));
    if (mine?.userId === userId) accepted.push(r.id);
  }
  return accepted;
}

/* ---------- Compteurs du menu ---------- */

export async function learningBadges(user: { id: string; role: string }) {
  const db = requireDb();
  if (user.role === "admin") {
    const [[items], [payments]] = await Promise.all([
      db.select({ n: count() }).from(learningItems).where(eq(learningItems.status, "submitted")),
      db.select({ n: count() }).from(learningPayments).where(eq(learningPayments.status, "pending")),
    ]);
    return { items: items.n, payments: payments.n, coaching: 0, teacherSubject: null };
  }
  if (user.role === "teacher") {
    const [[unread], profile] = await Promise.all([
      db
        .select({ n: count() })
        .from(coachingMessages)
        .innerJoin(coachingSessions, eq(coachingSessions.id, coachingMessages.sessionId))
        .where(
          and(
            eq(coachingSessions.teacherId, user.id),
            eq(coachingMessages.sender, "candidate"),
            isNull(coachingMessages.readAt),
          ),
        ),
      teacherProfile(user.id),
    ]);
    return {
      items: 0,
      payments: 0,
      coaching: unread.n,
      teacherSubject: profile?.subjectName ?? null,
    };
  }
  return { items: 0, payments: 0, coaching: 0, teacherSubject: null };
}

/** Enseignants (liste Admin). */
export async function teacherList() {
  return requireDb()
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      firstLogin: users.mustChangePassword,
      subjectName: subjects.name,
      items: sql<number>`(select count(*)::int from learning_items i where i.author_id = ${users.id} and i.status = 'approved')`,
      sessions: sql<number>`(select count(*)::int from coaching_sessions s where s.teacher_id = ${users.id} and s.status = 'active')`,
    })
    .from(users)
    .innerJoin(teachers, eq(teachers.userId, users.id))
    .innerJoin(subjects, eq(subjects.id, teachers.subjectId))
    .where(eq(users.role, "teacher"))
    .orderBy(asc(users.fullName));
}
