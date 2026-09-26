/**
 * Schéma de la gestion du Bacc (cahier des charges BacConnect, sections 5 et 10) :
 * comptes, Offices, candidats et convocations, épreuves et scans, notes et
 * résultats, demandes de relevé et de diplôme, notifications, journal d'audit.
 *
 * Les droits sont appliqués côté serveur (src/lib/auth.ts) : chaque requête est
 * filtrée par rôle et par Office.
 */
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  bigserial,
} from "drizzle-orm/pg-core";
import { examSessions, series, subjects } from "./schema";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/* ---------- Types énumérés ---------- */

export const userRoleEnum = pgEnum("user_role", ["admin", "office", "supervisor", "candidate", "school"]);
export const candidateStatusEnum = pgEnum("candidate_status", [
  "active",
  "admitted",
  "failed",
  "fraud",
  "absent",
  "disabled",
]);
export const candidateKindEnum = pgEnum("candidate_kind", ["ecole", "libre"]);
export const scanTypeEnum = pgEnum("scan_type", ["entry", "exit", "return", "end", "fraud", "doc_delivery"]);
export const decisionEnum = pgEnum("decision_type", ["admitted", "failed", "fraud", "absent"]);
export const mentionEnum = pgEnum("mention_type", ["passable", "assez_bien", "bien", "tres_bien"]);
export const docTypeEnum = pgEnum("doc_type", ["transcript", "diploma"]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "validated",
  "pickup_scheduled",
  "delivered",
  "rejected",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "mvola",
  "orange_money",
  "airtel_money",
  "bank_transfer",
]);
/** Dossier envoyé par une école : brouillon → envoyé → validé, incomplet (renvoyé) ou refusé. */
export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted",
  "incomplete",
  "rejected",
  "validated",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verified", "rejected"]);

/** Numéro séquentiel des matricules (BAC2027-S-00042). */
export const candidateNumberSeq = pgSequence("candidate_number_seq", { startWith: 1 });
/** Numéro séquentiel des demandes et tickets. */
export const requestNumberSeq = pgSequence("request_number_seq", { startWith: 1 });

/* ---------- Offices et comptes ---------- */

export const offices = pgTable("offices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  university: text("university").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Établissements qui présentent des candidats, rattachés à un Office du Bacc. */
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id")
    .notNull()
    .references(() => offices.id),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("public"), // public | prive
  commune: text("commune").notNull(),
  address: text("address"),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: userRoleEnum("role").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  officeId: integer("office_id").references(() => offices.id),
  schoolId: integer("school_id").references(() => schools.id),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  failedAttempts: smallint("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sessions de connexion : seul le hachage SHA-256 du jeton est stocké. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

/* ---------- Centres et salles ---------- */

export const examCenters = pgTable("exam_centers", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id")
    .notNull()
    .references(() => offices.id),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
});

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    centerId: integer("center_id")
      .notNull()
      .references(() => examCenters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull(),
  },
  (t) => [unique().on(t.centerId, t.name)],
);

/** Surveillant affecté à une salle pour toute la session. */
export const supervisorRooms = pgTable(
  "supervisor_rooms",
  {
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.supervisorId, t.roomId] })],
);

/* ---------- Candidats ---------- */

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .unique()
      .references(() => users.id),
    officeId: integer("office_id")
      .notNull()
      .references(() => offices.id),
    sessionId: integer("session_id")
      .notNull()
      .references(() => examSessions.id),
    matricule: text("matricule").notNull().unique(),
    lastName: text("last_name").notNull(),
    firstName: text("first_name").notNull(),
    birthDate: date("birth_date").notNull(),
    birthPlace: text("birth_place").notNull(),
    gender: text("gender").notNull(), // 'F' | 'M'
    cin: text("cin"),
    phone: text("phone"),
    email: text("email"),
    schoolName: text("school_name"),
    schoolId: integer("school_id").references(() => schools.id),
    address: text("address"),
    kind: candidateKindEnum("kind").notNull().default("ecole"),
    serieCode: text("serie_code")
      .notNull()
      .references(() => series.code),
    centerId: integer("center_id").references(() => examCenters.id),
    roomId: integer("room_id").references(() => rooms.id),
    seatNumber: integer("seat_number"),
    /** Jeton signé Ed25519 imprimé en QR sur la convocation (aucune donnée personnelle). */
    qrToken: text("qr_token").notNull().unique(),
    /** Mot de passe temporaire chiffré (AES-GCM), effacé au premier changement. */
    tempPasswordEnc: text("temp_password_enc"),
    status: candidateStatusEnum("status").notNull().default("active"),
    /** Réactivation manuelle par l'Office : l'emporte sur la désactivation automatique (RG-15). */
    reactivatedAt: timestamp("reactivated_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.lastName, t.firstName, t.birthDate),
    index().on(t.officeId, t.serieCode),
    index().on(t.roomId),
  ],
);

export const candidatePhotos = pgTable("candidate_photos", {
  candidateId: uuid("candidate_id")
    .primaryKey()
    .references(() => candidates.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
});

/* ---------- Emploi du temps et scans ---------- */

export const exams = pgTable(
  "exams",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => examSessions.id),
    serieCode: text("serie_code")
      .notNull()
      .references(() => series.code),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isPublished: boolean("is_published").notNull().default(false),
  },
  (t) => [unique().on(t.sessionId, t.serieCode, t.subjectId)],
);

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    examId: integer("exam_id").references(() => exams.id),
    roomId: integer("room_id").references(() => rooms.id),
    requestId: uuid("request_id"),
    scannedBy: uuid("scanned_by")
      .notNull()
      .references(() => users.id),
    type: scanTypeEnum("type").notNull(),
    comment: text("comment"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.examId, t.candidateId, t.type)],
);

/* ---------- Notes et résultats ---------- */

export const grades = pgTable(
  "grades",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    score: numeric("score", { precision: 4, scale: 2, mode: "number" }).notNull(),
    enteredBy: uuid("entered_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.candidateId, t.subjectId] })],
);

export const results = pgTable("results", {
  candidateId: uuid("candidate_id")
    .primaryKey()
    .references(() => candidates.id, { onDelete: "cascade" }),
  average: numeric("average", { precision: 5, scale: 2, mode: "number" }),
  mention: mentionEnum("mention"),
  decision: decisionEnum("decision").notNull(),
  deliberatedBy: uuid("deliberated_by").references(() => users.id),
  deliberatedAt: timestamp("deliberated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Liste noire, demandes, paiements ---------- */

export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id),
  reason: text("reason").notNull(),
  startsAt: date("starts_at").notNull().defaultNow(),
  endsAt: date("ends_at"),
  addedBy: uuid("added_by")
    .notNull()
    .references(() => users.id),
  liftedAt: timestamp("lifted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentRequests = pgTable(
  "document_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    type: docTypeEnum("type").notNull(),
    status: requestStatusEnum("status").notNull().default("pending"),
    pickupAt: timestamp("pickup_at", { withTimezone: true }),
    pickupPlace: text("pickup_place"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveredBy: uuid("delivered_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.candidateId, t.type)],
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .unique()
    .references(() => documentRequests.id, { onDelete: "cascade" }),
  method: paymentMethodEnum("method").notNull(),
  /** Référence de transaction : unique pour empêcher la réutilisation d'un reçu. */
  reference: text("reference").notNull().unique(),
  amount: integer("amount").notNull(),
  receiptMime: text("receipt_mime").notNull(),
  receipt: bytea("receipt").notNull(),
  ticketNumber: text("ticket_number").notNull().unique(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Notifications et audit ---------- */

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

/** Journal d'audit : insertion seule, jamais modifié (RG-17). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    tableName: text("table_name"),
    recordId: text("record_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.createdAt), index().on(t.tableName, t.recordId)],
);

/* ---------- Dossiers envoyés par les écoles ---------- */

/** Un envoi (lot) de dossiers d'une école à son Office. */
export const applicationBatches = pgTable("application_batches", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id),
  sessionId: integer("session_id")
    .notNull()
    .references(() => examSessions.id),
  count: integer("count").notNull(),
  sentBy: uuid("sent_by").references(() => users.id),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Dossier d'un élève préparé par son école ; validé, il devient un candidat avec sa convocation. */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    sessionId: integer("session_id")
      .notNull()
      .references(() => examSessions.id),
    batchId: integer("batch_id").references(() => applicationBatches.id),
    status: applicationStatusEnum("status").notNull().default("draft"),
    lastName: text("last_name").notNull(),
    firstName: text("first_name").notNull(),
    birthDate: date("birth_date").notNull(),
    birthPlace: text("birth_place").notNull(),
    gender: text("gender").notNull(),
    address: text("address").notNull(),
    serieCode: text("serie_code")
      .notNull()
      .references(() => series.code),
    cin: text("cin"),
    phone: text("phone"),
    email: text("email"),
    photoMime: text("photo_mime"),
    photo: bytea("photo"),
    /** Pièces du dossier cochées par l'école (acte de naissance, photos, reçu…). */
    pieces: jsonb("pieces").$type<string[]>().notNull().default([]),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    candidateId: uuid("candidate_id").references(() => candidates.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.schoolId, t.status)],
);
