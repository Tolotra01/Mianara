import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { NEWS_ART } from "@/components/illustrations/Spots";
import { formatDate } from "@/components/ui";
import type { News } from "@/lib/data";

const IMPORTANCE: Record<News["importance"], { label: string; className: string } | null> = {
  urgent: { label: "Important", className: "bg-danger-soft text-danger" },
  high: { label: "À savoir", className: "bg-info-soft text-info" },
  normal: null,
  low: null,
};

type NewsCardProps = {
  news: News;
  /**
   * `surface` : carte claire des pages intérieures (défaut).
   * `dark` : verre sombre de l'accueil — l'illustration part sur une plaque
   * lumineuse, le texte garde les tokens du thème sombre.
   */
  tone?: "surface" | "dark";
  /** Mise en avant : carte large, illustration à gauche du texte. */
  featured?: boolean;
  /** Libellé du lien de lecture ; l'appel n'apparaît que s'il est fourni. */
  readLabel?: string;
};

export function NewsCard({ news, tone = "surface", featured = false, readLabel }: NewsCardProps) {
  const Art = NEWS_ART[news.illustration] ?? NEWS_ART.reforme;
  const badge = IMPORTANCE[news.importance];
  const dark = tone === "dark";

  const shell = [
    "group relative overflow-hidden transition-all duration-300",
    dark
      ? "border border-line/70 bg-raised/45 shadow-sm hover:-translate-y-1.5 hover:border-vert/50 hover:bg-raised/70 hover:shadow-xl"
      : "border border-line bg-raised shadow-sm hover:-translate-y-1 hover:shadow-md",
    featured ? "rounded-3xl lg:grid lg:grid-cols-[1.1fr_1fr]" : "flex h-full flex-col rounded-2xl",
  ].join(" ");

  // Sur l'accueil, la tache de l'illustration est remontée en « plaque » claire
  // (cf. `.plate`) : c'est elle qui détache le dessin de la page nuit.
  const art = dark
    ? "plate plate-plain relative overflow-hidden"
    : "relative overflow-hidden bg-sunken";
  const artPad = featured ? "px-8 pt-4 pb-6 lg:flex lg:items-center lg:px-12 lg:py-2" : "px-8 pt-5";

  return (
    <Link href={`/actualites/${news.slug}`} className={shell}>
      <div className={`${art} ${artPad}`}>
        <Art className="w-full transition-transform duration-500 group-hover:scale-[1.06]" />
      </div>
      <div className={`flex flex-1 flex-col ${featured ? "p-7 sm:p-9" : "p-5"}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-vert-soft px-2.5 py-0.5 font-bold text-vert">{news.category}</span>
          {badge && (
            <span className={`rounded-full px-2.5 py-0.5 font-bold ${badge.className}`}>{badge.label}</span>
          )}
          <time dateTime={news.publishedAt} className="text-muted">
            {formatDate(news.publishedAt)}
          </time>
        </div>
        <h3
          className={`${featured ? "t-h2" : "t-h3"} mt-3 text-balance transition-colors group-hover:text-vert`}
        >
          {news.title}
        </h3>
        <p className="mt-2 text-muted">{news.excerpt}</p>
        {readLabel && (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-vert">
            {readLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        )}
      </div>
    </Link>
  );
}
