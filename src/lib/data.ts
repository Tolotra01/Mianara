import "server-only";
import { and, asc, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import * as t from "@/db/schema";
import * as bac from "@/content/bac";

export type Source = { key: string; label: string; url: string };

export type Coefficient = {
  serieCode: bac.SerieCode;
  subjectCode: string;
  subjectName: string;
  coefficient: number;
  isCore: boolean;
  confirmed: boolean;
  note: string | null;
};

export type BacData = {
  series: bac.Serie[];
  coefficients: Coefficient[];
  fees: (Omit<bac.Fee, "source"> & { sourceKey: string | null })[];
  dossier: bac.DossierItem[];
  calendar: (Omit<bac.CalendarEvent, "source"> & { sourceKey: string | null })[];
  tips: bac.Tip[];
  faqs: bac.Faq[];
  sources: Record<string, Source>;
};

export type News = Omit<bac.NewsItem, "source"> & { sourceKey: string | null };

/* ---------- Repli sans base ---------- */

function localBacData(): BacData {
  const subjectName = new Map(bac.SUBJECTS.map((s) => [s.code, s.name]));
  return {
    series: bac.SERIES,
    coefficients: bac.SERIE_SUBJECTS.map((ss) => ({
      serieCode: ss.serieCode as bac.SerieCode,
      subjectCode: ss.subjectCode,
      subjectName: subjectName.get(ss.subjectCode) ?? ss.subjectCode,
      coefficient: ss.coefficient,
      isCore: ss.isCore,
      confirmed: ss.confirmed,
      note: ss.note ?? null,
    })),
    fees: bac.FEES.map(({ source, ...f }) => ({ ...f, sourceKey: source })),
    dossier: bac.DOSSIER_ITEMS,
    calendar: bac.CALENDAR.map(({ source, ...c }) => ({ ...c, sourceKey: source })),
    tips: bac.TIPS,
    faqs: bac.FAQS,
    sources: Object.fromEntries(Object.entries(bac.SOURCES).map(([key, s]) => [key, { key, ...s }])),
  };
}

const localNews = (): News[] =>
  [...bac.NEWS]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(({ source, ...n }) => ({ ...n, sourceKey: source }));

/* ---------- Lecture PostgreSQL ---------- */

export const getBacData = cache(async (): Promise<BacData> => {
  if (!db) return localBacData();

  const [series, coefficients, fees, dossier, calendar, tips, faqs, sources] = await Promise.all([
    // La vitrine présente le Bacc général ; le Bacc technique est géré dans les espaces.
    db.select().from(t.series).where(eq(t.series.track, "general")).orderBy(asc(t.series.sortOrder)),
    db
      .select({
        serieCode: t.serieSubjects.serieCode,
        subjectCode: t.subjects.code,
        subjectName: t.subjects.name,
        coefficient: t.serieSubjects.coefficient,
        isCore: t.serieSubjects.isCore,
        confirmed: t.serieSubjects.isConfirmed,
        note: t.serieSubjects.note,
      })
      .from(t.serieSubjects)
      .innerJoin(t.subjects, eq(t.serieSubjects.subjectId, t.subjects.id))
      .innerJoin(t.series, and(eq(t.series.code, t.serieSubjects.serieCode), eq(t.series.track, "general")))
      .orderBy(desc(t.serieSubjects.coefficient), asc(t.subjects.id)),
    db.select().from(t.registrationFees).orderBy(asc(t.registrationFees.amountAriary)),
    db.select().from(t.dossierItems).orderBy(asc(t.dossierItems.sortOrder)),
    db.select().from(t.calendarEvents).orderBy(asc(t.calendarEvents.startsOn)),
    db.select().from(t.tips).orderBy(asc(t.tips.sortOrder)),
    db.select().from(t.faqs).orderBy(asc(t.faqs.sortOrder)),
    db.select().from(t.sources),
  ]);

  return {
    series: series.map(({ track: _track, ...s }) => ({ ...s, code: s.code as bac.SerieCode })),
    coefficients: coefficients.map((c) => ({ ...c, serieCode: c.serieCode as bac.SerieCode })),
    fees: fees.map((f) => ({
      candidateType: f.candidateType as bac.Fee["candidateType"],
      label: f.label,
      amountAriary: f.amountAriary,
      sessionYear: f.sessionYear,
      sourceKey: f.sourceKey,
    })),
    dossier: dossier.map((d) => ({
      label: d.label,
      detail: d.detail,
      candidateType: d.candidateType as bac.CandidateType,
      icon: d.icon,
      confirmed: d.isConfirmed,
      sortOrder: d.sortOrder,
    })),
    calendar: calendar.map((c) => ({
      sessionYear: c.sessionYear,
      title: c.title,
      startsOn: c.startsOn,
      endsOn: c.endsOn ?? undefined,
      dateLabel: c.dateLabel,
      kind: c.kind,
      confirmed: c.isConfirmed,
      sourceKey: c.sourceKey,
    })),
    tips,
    faqs,
    sources: Object.fromEntries(sources.map((s) => [s.key, s])),
  };
});

const published = and(isNotNull(t.news.publishedAt), isNull(t.news.archivedAt));

function toNews(row: typeof t.news.$inferSelect): News {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category,
    importance: row.importance,
    illustration: row.illustration as bac.NewsItem["illustration"],
    publishedAt: row.publishedAt!.toISOString().slice(0, 10),
    sourceKey: row.sourceKey,
  };
}

export const getNews = cache(async (limit?: number): Promise<News[]> => {
  if (!db) return localNews().slice(0, limit);
  const query = db.select().from(t.news).where(published).orderBy(desc(t.news.publishedAt));
  const rows = limit ? await query.limit(limit) : await query;
  return rows.map(toNews);
});

export const getNewsBySlug = cache(async (slug: string): Promise<News | null> => {
  if (!db) return localNews().find((n) => n.slug === slug) ?? null;
  const [row] = await db
    .select()
    .from(t.news)
    .where(and(published, eq(t.news.slug, slug)))
    .limit(1);
  return row ? toNews(row) : null;
});
