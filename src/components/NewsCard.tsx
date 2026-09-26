import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { NEWS_ART } from "@/components/illustrations/Spots";
import { formatDate } from "@/components/ui";
import type { News } from "@/lib/data";
import { newsCategory, type Lang } from "@/lib/i18n";

const IMPORTANCE: Record<News["importance"], { label: Record<Lang, string>; className: string } | null> = {
  urgent: { label: { fr: "Important", mg: "Zava-dehibe" }, className: "bg-danger-soft text-danger" },
  high: { label: { fr: "À savoir", mg: "Tokony ho fantatra" }, className: "bg-info-soft text-info" },
  normal: null,
  low: null,
};

type NewsCardProps = {
  news: News;
  /**
   * `surface` : cartes claires des pages intérieures (défaut).
   * `dark` : verre sombre de l'accueil — l'illustration part sur une plaque
   * lumineuse, le texte garde les tokens du thème sombre.
   */
  tone?: "surface" | "dark";
  /**
   * `card` : grille de tuiles (défaut, page /actualites).
   * `row` : fil éditorial — une ligne par actualité, vignette à gauche et
   * filets de séparation. Se lit comme une liste de presse.
   */
  variant?: "card" | "row";
  /** Mise en avant : carte large, illustration à gauche du texte. */
  featured?: boolean;
  /** Libellé du lien de lecture ; l'appel n'apparaît que s'il est fourni. */
  readLabel?: string;
  lang?: Lang;
};

/** Catégorie, importance et date — communes aux deux présentations. */
function Meta({ news, lang }: { news: News; lang: Lang }) {
  const badge = IMPORTANCE[news.importance];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-full bg-vert-soft px-2.5 py-0.5 font-bold text-vert">
        {newsCategory(news.category, lang)}
      </span>
      {badge && (
        <span className={`rounded-full px-2.5 py-0.5 font-bold ${badge.className}`}>{badge.label[lang]}</span>
      )}
      <time dateTime={news.publishedAt} className="font-mono text-xs text-muted">
        {formatDate(news.publishedAt, lang)}
      </time>
    </div>
  );
}

/** Grille de tuiles. `featured` passe la carte en pleine largeur. */
function NewsTile({
  news,
  tone,
  featured,
  readLabel,
  lang,
}: {
  news: News;
  tone: "surface" | "dark";
  featured: boolean;
  readLabel?: string;
  lang: Lang;
}) {
  const Art = NEWS_ART[news.illustration] ?? NEWS_ART.reforme;
  const dark = tone === "dark";

  const shell = [
    "group relative overflow-hidden transition-all duration-300",
    dark
      ? "border border-line/70 bg-raised/45 shadow-sm hover:-translate-y-1.5 hover:border-vert/50 hover:bg-raised/70 hover:shadow-xl"
      : "border border-line bg-raised shadow-sm hover:-translate-y-1 hover:shadow-md",
    featured ? "rounded-3xl lg:grid lg:grid-cols-[1.1fr_1fr]" : "flex h-full flex-col rounded-2xl",
  ].join(" ");

  // L'illustration est toujours montée sur une plaque claire (cf. `.plate`) :
  // sa tache de fond pastel reste lisible dans les deux thèmes.
  const art = "plate plate-plain relative overflow-hidden";
  const artPad = featured ? "px-8 pt-4 pb-6 lg:flex lg:items-center lg:px-12 lg:py-2" : "px-8 pt-5";

  return (
    <Link href={`/actualites/${news.slug}`} className={shell}>
      <div className={`${art} ${artPad}`}>
        <Art className="w-full transition-transform duration-500 group-hover:scale-[1.06]" />
      </div>
      <div className={`flex flex-1 flex-col ${featured ? "p-7 sm:p-9" : "p-5"}`}>
        <Meta news={news} lang={lang} />
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

/** Fil éditorial : une ligne par actualité. La vignette garde le rapport 4:3
 *  des illustrations (Spots), la plaque claire les détache de la page nuit. */
function NewsRow({ news, readLabel, lang }: { news: News; readLabel?: string; lang: Lang }) {
  const Art = NEWS_ART[news.illustration] ?? NEWS_ART.reforme;
  const art = "plate plate-plain aspect-[4/3] w-24 sm:w-36";

  return (
    <Link
      href={`/actualites/${news.slug}`}
      className="group flex items-center gap-5 border-b border-line/60 py-5 transition-colors last:border-b-0 hover:bg-raised/40 sm:gap-7 sm:py-6"
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-line/60 transition-transform duration-500 group-hover:-translate-y-1 ${art}`}
      >
        {/* `w-full` seulement : le SVG conserve son `h-auto` et son rapport
            4:3, qui remplit exactement la plaque. Un `h-full` ici entrerait en
            conflit avec ce `h-auto` (même spécificité). */}
        <Art className="w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <Meta news={news} lang={lang} />
        <h3 className="t-h3 mt-2 text-balance transition-colors group-hover:text-vert">{news.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{news.excerpt}</p>
      </div>
      {readLabel ? (
        <span className="hidden shrink-0 items-center gap-2 text-sm font-bold text-vert sm:inline-flex">
          {readLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      ) : (
        <ArrowRight className="size-5 shrink-0 text-muted transition-all group-hover:translate-x-1 group-hover:text-vert sm:hidden" />
      )}
    </Link>
  );
}

export function NewsCard({
  news,
  tone = "surface",
  variant = "card",
  featured = false,
  readLabel,
  lang = "fr",
}: NewsCardProps) {
  if (variant === "row") return <NewsRow news={news} readLabel={readLabel} lang={lang} />;
  return <NewsTile news={news} tone={tone} featured={featured} readLabel={readLabel} lang={lang} />;
}
