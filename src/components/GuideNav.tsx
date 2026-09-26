import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui";
import { GUIDE_SECTIONS, type GuideSlug } from "@/lib/guide";

/** Rubrique précédente / suivante, en bas de chaque page du guide. */
export function GuideNav({ current }: { current: GuideSlug }) {
  const i = GUIDE_SECTIONS.findIndex((s) => s.slug === current);
  const prev = GUIDE_SECTIONS[i - 1];
  const next = GUIDE_SECTIONS[i + 1];
  return (
    <Container className="mt-16">
      <nav aria-label="Rubriques du guide" className="grid gap-4 sm:grid-cols-2">
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
              <span className="block text-sm text-muted">Précédent</span>
              <span className="t-h3 group-hover:text-vert">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <Link
            href="/guide"
            className="group flex items-center gap-3 rounded-2xl border border-line bg-raised p-4 shadow-sm hover:border-vert"
          >
            <ArrowLeft className="size-5 text-muted group-hover:text-vert" />
            <span className="t-h3 group-hover:text-vert">Sommaire du guide</span>
          </Link>
        )}
        {next && (
          <Link
            href={`/guide/${next.slug}`}
            className="group flex items-center justify-end gap-4 rounded-2xl border border-line bg-raised p-4 text-right shadow-sm hover:border-vert sm:col-start-2"
          >
            <span>
              <span className="block text-sm text-muted">Suivant</span>
              <span className="t-h3 group-hover:text-vert">{next.title}</span>
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
