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

export function NewsCard({ news }: { news: News }) {
  const Art = NEWS_ART[news.illustration] ?? NEWS_ART.reforme;
  const badge = IMPORTANCE[news.importance];
  return (
    <Link
      href={`/actualites/${news.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="bg-sunken px-8 pt-6">
        <Art className="transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-vert-soft px-2.5 py-0.5 font-bold text-vert">{news.category}</span>
          {badge && (
            <span className={`rounded-full px-2.5 py-0.5 font-bold ${badge.className}`}>{badge.label}</span>
          )}
          <time dateTime={news.publishedAt} className="text-muted">
            {formatDate(news.publishedAt)}
          </time>
        </div>
        <h3 className="t-h3 mt-3 text-balance group-hover:text-vert">{news.title}</h3>
        <p className="mt-2 text-muted">{news.excerpt}</p>
      </div>
    </Link>
  );
}
