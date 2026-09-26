import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GuideArt } from "@/components/illustrations/Spots";
import { Container, PageHero } from "@/components/ui";
import { GUIDE_SECTIONS } from "@/lib/guide";

export const metadata: Metadata = {
  title: "Guide du Bac",
  description:
    "Séries, coefficients, dossier, calendrier, jour J et résultats : le Bac malgache expliqué en images.",
};

export default function GuidePage() {
  return (
    <>
      <PageHero
        overline="Guide du Bac"
        title="Tout le Bac, en sept étapes"
        lead="Choisis une rubrique. Chaque page va à l'essentiel."
        art={<GuideArt />}
      />
      <Container className="py-16">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_SECTIONS.map((s, i) => (
            <li key={s.slug} className={i === 0 ? "sm:col-span-2 lg:col-span-1" : undefined}>
              <Link
                href={`/guide/${s.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-raised shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`relative px-10 pt-6 ${s.tint}`}>
                  <span className="absolute top-4 left-4 grid size-10 place-items-center rounded-full bg-raised font-extrabold text-vert shadow-sm">
                    {i + 1}
                  </span>
                  <s.Art className="transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 items-end justify-between gap-4 p-6">
                  <div>
                    <h2 className="t-h2 group-hover:text-vert">{s.title}</h2>
                    <p className="mt-1 text-muted">{s.short}</p>
                  </div>
                  <ArrowRight className="size-6 shrink-0 text-vert transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Container>
    </>
  );
}
