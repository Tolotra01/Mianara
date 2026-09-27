/**
 * Apprentissage (application Mianara Mobile) : contenus pédagogiques validés
 * par l'Administration, paiements Orange Money, tutorat entre un candidat et
 * un enseignant, séances de révision synchronisées depuis le téléphone.
 */
import {
  bigserial,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { subjects } from "./schema";
import { users } from "./schema-gestion";

export const learningKindEnum = pgEnum("learning_kind", ["course", "training", "coaching"]);
export const learningStatusEnum = pgEnum("learning_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "archived",
]);
export const learningPaymentStatusEnum = pgEnum("learning_payment_status", [
  "pending",
  "approved",
  "rejected",
]);
export const coachingStatusEnum = pgEnum("coaching_status", ["pending_payment", "active", "closed"]);
export const messageSenderEnum = pgEnum("message_sender", ["candidate", "teacher"]);

/** Enseignant : matière enseignée (affichée aux candidats à la place de son nom). */
export const teachers = pgTable("teachers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Cours, exercice (« training ») ou offre de coaching, publié après validation. */
export const learningItems = pgTable(
  "learning_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: learningKindEnum("kind").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull().default(""),
    /** En ariary ; null ou 0 = gratuit. */
    priceAmount: integer("price_amount"),
    durationMinutes: integer("duration_minutes"),
    status: learningStatusEnum("status").notNull().default("draft"),
    reviewNote: text("review_note"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.status, t.subjectId), index().on(t.authorId)],
);

/** Paiement Orange Money déclaré par le candidat (référence de transaction), vérifié par l'Admin. */
export const learningPayments = pgTable(
  "learning_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => learningItems.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    amount: integer("amount").notNull(),
    status: learningPaymentStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.reference), index().on(t.userId, t.itemId), index().on(t.status)],
);

/** Séance de tutorat : ouverte au paiement, active après validation, close par l'enseignant. */
export const coachingSessions = pgTable(
  "coaching_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => learningItems.id),
    candidateUserId: uuid("candidate_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id),
    paymentId: uuid("payment_id").references(() => learningPayments.id),
    status: coachingStatusEnum("status").notNull().default("pending_payment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index().on(t.candidateUserId), index().on(t.teacherId, t.status)],
);

export const coachingMessages = pgTable(
  "coaching_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => coachingSessions.id, { onDelete: "cascade" }),
    sender: messageSenderEnum("sender").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.sessionId, t.createdAt)],
);

/** Séances de révision chronométrées sur le téléphone (identifiant fourni par l'application). */
export const revisionSessions = pgTable(
  "revision_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectCode: text("subject_code").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    progress: integer("progress"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.startedAt)],
);

/** Réglages de la plateforme modifiables par l'Admin (numéro marchand Orange Money…). */
export const platformSettings = pgTable(
  "platform_settings",
  {
    key: text("key").notNull(),
    value: text("value"),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.key] })],
);
