import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskButton } from "@/components/assistant/AskButton";
import { NEWS_SCENE } from "@/components/illustrations/PageScenes";
import { NewsCard } from "@/components/NewsCard";
import { buttonClass, Container, formatDate, PageHero } from "@/components/ui";
import { getBacData, getNews, getNewsBySlug } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const news = await getNewsBySlug((await params).slug);
  return news ? { title: news.title, description: news.excerpt } : {};
}

export default async function ArticlePage({ params }: PageProps<"/actualites/[slug]">) {
  const { slug } = await params;
  const [news, all, data] = await Promise.all([getNewsBySlug(slug), getNews(), getBacData()]);
  if (!news) notFound();

  const source = news.sourceKey ? data.sources[news.sourceKey] : null;
  const related = all.filter((n) => n.slug !== news.slug).slice(0, 3);

  return (
    <article>
      <PageHero
        top={
          <Link
            href="/actualites"
            className="mb-5 flex w-fit items-center gap-1.5 font-semibold text-muted hover:text-vert"
          >
            <ArrowLeft className="size-4" /> Actualités
          </Link>
        }
        overline={
          <>
            {news.category}
            <span aria-hidden className="text-ink/40">
              ·
            </span>
            <time dateTime={news.publishedAt} className="font-semibold text-muted">
              {formatDate(news.publishedAt)}
            </time>
          </>
        }
        title={news.title}
        lead={news.excerpt}
        scene={NEWS_SCENE[news.illustration] ?? "actualites"}
      />

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
