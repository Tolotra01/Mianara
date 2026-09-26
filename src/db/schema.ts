/**
 * Schéma PostgreSQL de la vitrine Mianara (Neon ou Supabase).
 *
 * Les tables reprennent les noms du cahier des charges BacConnect
 * (series, subjects, serie_subjects, exam_sessions, news) pour que les
 * espaces Candidat, Office du Bac et Admin viennent s'y greffer ensuite.
 */
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const candidateTypeEnum = pgEnum("candidate_type", ["tous", "ecole", "libre", "etranger"]);
export const newsImportanceEnum = pgEnum("news_importance", ["low", "normal", "high", "urgent"]);
export const calendarKindEnum = pgEnum("calendar_kind", ["inscription", "examen", "resultats", "reforme"]);
export const tipCategoryEnum = pgEnum("tip_category", ["preparer", "jour_j", "apres"]);

/* ---------- Référentiel ---------- */

export const sources = pgTable("sources", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
});

export const series = pgTable("series", {
  code: text("code").primaryKey(), // 'L', 'S', 'OSE'
  name: text("name").notNull(),
  nameMg: text("name_mg").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  forWhom: text("for_whom").array().notNull(),
  careers: text("careers").array().notNull(),
  formerOptions: text("former_options").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameMg: text("name_mg").notNull(),
});

export const serieSubjects = pgTable(
  "serie_subjects",
  {
    serieCode: text("serie_code")
      .notNull()
      .references(() => series.code),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    coefficient: numeric("coefficient", { precision: 3, scale: 1, mode: "number" }).notNull(),
    isCore: boolean("is_core").notNull().default(false),
    isConfirmed: boolean("is_confirmed").notNull().default(true),
    note: text("note"),
  },
  (t) => [primaryKey({ columns: [t.serieCode, t.subjectId] })],
);

export const examSessions = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull().unique(),
  isCurrent: boolean("is_current").notNull().default(false),
});

/* ---------- Guide ---------- */

export const registrationFees = pgTable("registration_fees", {
  id: serial("id").primaryKey(),
  sessionYear: integer("session_year").notNull(),
  candidateType: candidateTypeEnum("candidate_type").notNull(),
  label: text("label").notNull(),
  amountAriary: integer("amount_ariary").notNull(),
  sourceKey: text("source_key").references(() => sources.key),
});

export const dossierItems = pgTable("dossier_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  detail: text("detail").notNull(),
  candidateType: candidateTypeEnum("candidate_type").notNull(),
  icon: text("icon").notNull(),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  sessionYear: integer("session_year").notNull(),
  title: text("title").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on"),
  dateLabel: text("date_label").notNull(),
  kind: calendarKindEnum("kind").notNull(),
  isConfirmed: boolean("is_confirmed").notNull().default(true),
  sourceKey: text("source_key").references(() => sources.key),
});

export const tips = pgTable("tips", {
  id: serial("id").primaryKey(),
  category: tipCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
});

/* ---------- Actualités ---------- */

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  importance: newsImportanceEnum("importance").notNull().default("normal"),
  illustration: text("illustration").notNull(),
  sourceKey: text("source_key").references(() => sources.key),
  // Rempli par l'espace Admin / Office du Bac dans la phase suivante.
  authorId: text("author_id"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
