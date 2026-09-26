import type { Metadata } from "next";
import Link from "next/link";
import { NewsCard } from "@/components/NewsCard";
import { Container, FrenchOnlyNote, PageHero } from "@/components/ui";
import { getNews } from "@/lib/data";
import { newsCategory } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Actualités du Bacc",
  description:
    "Réforme, calendrier, inscriptions : les dernières nouvelles du Baccalauréat à Madagascar, avec leurs sources.",
};

const T = {
  fr: {
    overline: "Actualités",
    title: "Les nouvelles du Bacc",
    accent: "du Bacc",
    lead: "Chaque information est datée et renvoie à sa source.",
    categories: "Catégories",
    all: "Tout",
    top: "À la une",
    readTop: "Lire l'article",
    allNews: "Toutes les nouvelles",
    read: "Lire",
    others: (n: number) => `${n} autre${n > 1 ? "s" : ""} actualité${n > 1 ? "s" : ""}`,
  },
  mg: {
    overline: "Vaovao",
    title: "Ny vaovao momba ny Bacc",
    accent: "momba ny Bacc",
    lead: "Misy daty sy loharano avy ny vaovao tsirairay.",
    categories: "Sokajy",
    all: "Rehetra",
    top: "Vaovao lehibe",
    readTop: "Vakio ny lahatsoratra",
    allNews: "Ny vaovao rehetra",
    read: "Vakio",
    others: (n: number) => `Vaovao ${n} hafa`,
  },
};

export default async function ActualitesPage({ searchParams }: PageProps<"/actualites">) {
  const [news, params, lang] = await Promise.all([getNews(), searchParams, getLang()]);
  const t = T[lang];
  const categories = [...new Set(news.map((n) => n.category))];
  const active =
    typeof params.categorie === "string" && categories.includes(params.categorie) ? params.categorie : null;
  const shown = active ? news.filter((n) => n.category === active) : news;

  const count = (c: string | null) => (c ? news.filter((n) => n.category === c).length : news.length);
  const chip = (label: string, href: string, on: boolean, n: number) => (
    <Link
      key={label}
      href={href}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 text-sm font-semibold transition-colors ${
        on ? "bg-vert text-on-vert" : "text-muted hover:bg-sunken hover:text-ink"
      }`}
    >
      {label}
      <span
        className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 font-mono text-xs font-bold ${
          on ? "bg-on-vert/15" : "bg-sunken"
        }`}
      >
        {n}
      </span>
    </Link>
  );
  const [first, ...rest] = shown;
  // Trois colonnes, sauf quand deux évitent une carte seule sur sa rangée (2, 4, 8…).
  const cols = rest.length % 3 !== 0 && rest.length % 2 === 0 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="actualites" />
      <Container className="py-12 lg:py-16">
        {/* Filtres : une barre unique, défilante sur mobile, avec le nombre
            d'actualités par catégorie. */}
        <nav
          aria-label={t.categories}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-fit sm:flex-wrap sm:rounded-full sm:border sm:border-line sm:bg-raised sm:p-1.5 sm:shadow-sm"
        >
          {chip(t.all, "/actualites", !active, count(null))}
          {categories.map((c) =>
            chip(
              newsCategory(c, lang),
              `/actualites?categorie=${encodeURIComponent(c)}`,
              active === c,
              count(c),
            ),
          )}
        </nav>
        <FrenchOnlyNote lang={lang} />

        {first && (
          <section aria-labelledby="une" className="mt-10">
            <h2 id="une" className="t-overline flex items-center gap-2 text-mena">
              <span className="size-2 rounded-full bg-mena" aria-hidden /> {t.top}
            </h2>
            <div className="mt-4">
              <NewsCard news={first} featured readLabel={t.readTop} lang={lang} />
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section aria-labelledby="fil" className="mt-14">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <h2 id="fil" className="t-h2">
                {active ? newsCategory(active, lang) : t.allNews}
              </h2>
              <p className="text-sm text-muted">{t.others(rest.length)}</p>
            </div>
            <div className={`mt-6 grid gap-6 md:grid-cols-2 ${cols}`}>
              {rest.map((n) => (
                <NewsCard key={n.slug} news={n} readLabel={t.read} lang={lang} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
