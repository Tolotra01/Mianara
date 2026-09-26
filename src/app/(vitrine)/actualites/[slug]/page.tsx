import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskButton } from "@/components/assistant/AskButton";
import { NEWS_ART } from "@/components/illustrations/Spots";
import { NewsCard } from "@/components/NewsCard";
import { buttonClass, Container, formatDate } from "@/components/ui";
import { getBacData, getNews, getNewsBySlug } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const news = await getNewsBySlug((await params).slug);
  return news ? { title: news.title, description: news.excerpt } : {};
}

export default async function ArticlePage({ params }: PageProps<"/actualites/[slug]">) {
  const { slug } = await params;
  const [news, all, data] = await Promise.all([getNewsBySlug(slug), getNews(), getBacData()]);
  if (!news) notFound();

  const Art = NEWS_ART[news.illustration] ?? NEWS_ART.reforme;
  const source = news.sourceKey ? data.sources[news.sourceKey] : null;
  const related = all.filter((n) => n.slug !== news.slug).slice(0, 3);

  return (
    <article>
      <header className="border-b border-line bg-raised">
        <Container className="grid items-center gap-8 py-10 md:grid-cols-[3fr_2fr]">
          <div>
            <Link
              href="/actualites"
              className="inline-flex items-center gap-1.5 font-semibold text-muted hover:text-vert"
            >
              <ArrowLeft className="size-4" /> Actualités
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-vert-soft px-2.5 py-0.5 font-bold text-vert">
                {news.category}
              </span>
              <time dateTime={news.publishedAt} className="text-muted">
                {formatDate(news.publishedAt)}
              </time>
            </div>
            <h1 className="t-display mt-3 text-balance">{news.title}</h1>
            <p className="t-body-lg mt-4 text-muted">{news.excerpt}</p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <Art />
          </div>
        </Container>
      </header>

      <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,44rem)_20rem] lg:justify-center lg:gap-16 xl:grid-cols-[minmax(0,46rem)_22rem] xl:gap-24">
        <div className="t-body-lg space-y-5">
          {news.body.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {source && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-3xl border border-line bg-raised p-5 shadow-sm hover:border-vert"
            >
              <span className="t-overline text-muted">Source</span>
              <span className="mt-2 flex items-start justify-between gap-3 font-semibold">
                {source.label}
                <ExternalLink className="size-5 shrink-0 text-vert" aria-hidden />
              </span>
            </a>
          )}
          <div className="rounded-3xl bg-vert-soft p-5">
            <p className="font-bold">Une question sur cette actualité ?</p>
            <AskButton
              question={`Explique-moi simplement : « ${news.title} »`}
              className={`${buttonClass.primary} mt-3 w-full`}
            >
              <MessageCircleQuestion className="size-5" /> Demander à l&apos;assistant
            </AskButton>
          </div>
        </aside>
      </Container>

      {related.length > 0 && (
        <Container>
          <h2 className="t-h1 mb-6">À lire aussi</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((n) => (
              <NewsCard key={n.slug} news={n} />
            ))}
          </div>
        </Container>
      )}
    </article>
  );
}
