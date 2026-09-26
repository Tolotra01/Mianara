import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui";
import { GUIDE_SECTIONS, sectionText, type GuideSlug } from "@/lib/guide";
import { COMMON, type Lang } from "@/lib/i18n";

/** Rubrique précédente / suivante, en bas de chaque page du guide. */
export function GuideNav({ current, lang = "fr" }: { current: GuideSlug; lang?: Lang }) {
  const c = COMMON[lang];
  const i = GUIDE_SECTIONS.findIndex((s) => s.slug === current);
  const prev = GUIDE_SECTIONS[i - 1];
  const next = GUIDE_SECTIONS[i + 1];
  return (
    <Container className="mt-16">
      <nav aria-label={c.guideNav} className="grid gap-4 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/guide/${prev.slug}`}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-raised p-4 shadow-sm hover:border-vert"
          >
            <ArrowLeft className="size-5 text-muted group-hover:text-vert" />
            <span className={`w-20 shrink-0 rounded-xl ${prev.tint} p-1`}>
              <prev.Art />
            </span>
            <span>
              <span className="block text-sm text-muted">{c.previous}</span>
              <span className="t-h3 group-hover:text-vert">{sectionText(prev, lang).title}</span>
            </span>
          </Link>
        ) : (
          <Link
            href="/guide"
            className="group flex items-center gap-3 rounded-2xl border border-line bg-raised p-4 shadow-sm hover:border-vert"
          >
            <ArrowLeft className="size-5 text-muted group-hover:text-vert" />
            <span className="t-h3 group-hover:text-vert">{c.guideHome}</span>
          </Link>
        )}
        {next && (
          <Link
            href={`/guide/${next.slug}`}
            className="group flex items-center justify-end gap-4 rounded-2xl border border-line bg-raised p-4 text-right shadow-sm hover:border-vert sm:col-start-2"
          >
            <span>
              <span className="block text-sm text-muted">{c.next}</span>
              <span className="t-h3 group-hover:text-vert">{sectionText(next, lang).title}</span>
            </span>
            <span className={`w-20 shrink-0 rounded-xl ${next.tint} p-1`}>
              <next.Art />
            </span>
            <ArrowRight className="size-5 text-muted group-hover:text-vert" />
          </Link>
        )}
      </nav>
    </Container>
  );
}
