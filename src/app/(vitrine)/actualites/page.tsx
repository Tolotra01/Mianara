import type { Metadata } from "next";
import Link from "next/link";
import { NewsCard } from "@/components/NewsCard";
import { Container, PageHero } from "@/components/ui";
import { getNews } from "@/lib/data";

export const metadata: Metadata = {
  title: "Actualités du Bac",
  description:
    "Réforme, calendrier, inscriptions : les dernières nouvelles du Baccalauréat à Madagascar, avec leurs sources.",
};

export default async function ActualitesPage({ searchParams }: PageProps<"/actualites">) {
  const [news, params] = await Promise.all([getNews(), searchParams]);
  const categories = [...new Set(news.map((n) => n.category))];
  const active =
    typeof params.categorie === "string" && categories.includes(params.categorie) ? params.categorie : null;
  const shown = active ? news.filter((n) => n.category === active) : news;

  const chip = (label: string, href: string, on: boolean) => (
    <Link
      key={label}
      href={href}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={`rounded-full px-4 py-2 font-semibold transition-colors ${
        on ? "bg-vert text-on-vert" : "border border-line-strong bg-raised hover:border-vert hover:text-vert"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHero
        overline="Actualités"
        title="Les nouvelles du Bac"
        accent="du Bac"
        lead="Chaque information est datée et renvoie à sa source."
        scene="actualites"
      />
      <Container className="py-12">
        <nav aria-label="Catégories" className="flex flex-wrap gap-2">
          {chip("Tout", "/actualites", !active)}
          {categories.map((c) => chip(c, `/actualites?categorie=${encodeURIComponent(c)}`, active === c))}
        </nav>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
          {shown.map((n) => (
            <NewsCard key={n.slug} news={n} />
          ))}
        </div>
      </Container>
    </>
  );
}
