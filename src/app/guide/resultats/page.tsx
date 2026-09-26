import type { Metadata } from "next";
import { ArrowRight, ExternalLink, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { AskButton } from "@/components/assistant/AskButton";
import { GuideNav } from "@/components/GuideNav";
import { ResultatsArt, SERIE_ART } from "@/components/illustrations/Spots";
import { TipGrid } from "@/components/TipGrid";
import { Breadcrumb, buttonClass, Container, PageHero, SourceLink } from "@/components/ui";
import { RULES } from "@/content/bac";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Résultats du Bacc et après",
  description:
    "Moyenne d'admission, mentions, où consulter les résultats du Bacc et comment préparer la suite.",
};

const BANDS = [
  { from: 0, to: RULES.juryFloor, label: "Ajourné", className: "bg-danger-soft text-danger" },
  { from: RULES.juryFloor, to: RULES.admissionAverage, label: "Jury", className: "bg-soleil text-ink" },
  ...RULES.mentions.map((m, i) => ({
    from: m.min,
    to: m.max,
    label: m.label,
    className: [
      "bg-vert-soft text-vert",
      "bg-vert/40 text-ink",
      "bg-vert/70 text-on-vert",
      "bg-vert text-on-vert",
    ][i],
  })),
];

export default async function ResultatsPage() {
  const data = await getBacData();
  return (
    <>
      <PageHero
        overline="Guide · 7"
        title="Résultats, mentions, et la suite"
        lead="10/20 de moyenne pour être admis. Ensuite, place à ton orientation."
        art={<ResultatsArt />}
      />
      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Résultats et après" }]} />

        <h2 className="t-h1">L&apos;échelle des mentions</h2>
        <div className="mt-8 rounded-4xl border border-line bg-raised p-6 shadow-sm md:p-8">
          <div className="flex h-24 overflow-hidden rounded-2xl">
            {BANDS.map((b) => (
              <div
                key={b.label}
                className={`flex flex-col items-center justify-center px-1 text-center ${b.className}`}
                style={{ width: `${((b.to - b.from) / 20) * 100}%` }}
              >
                {b.to - b.from >= 1 && (
                  <span className="text-sm leading-tight font-bold md:text-base">{b.label}</span>
                )}
              </div>
            ))}
          </div>
          <div className="relative mt-2 h-6 text-sm font-bold text-muted">
            {[0, 10, 12, 14, 16, 20].map((v) => (
              <span key={v} className="absolute -translate-x-1/2" style={{ left: `${(v / 20) * 100}%` }}>
                {v.toLocaleString("fr-FR")}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <span className="inline-block size-3 rounded-sm bg-soleil" aria-hidden />
            Entre 9,50 et 10 : le jury peut délibérer.
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            <li className="rounded-2xl bg-sunken p-4">
              <p className="font-bold">Admis dès 10/20</p>
              <p className="mt-1 text-muted">Moyenne générale sur l&apos;ensemble des épreuves.</p>
            </li>
            <li className="rounded-2xl bg-sunken p-4">
              <p className="font-bold">Le jury peut descendre à 9,50</p>
              <p className="mt-1 text-muted">Jamais en dessous. Sa décision est sans recours.</p>
            </li>
            <li className="rounded-2xl bg-sunken p-4">
              <p className="font-bold">Pas de rattrapage</p>
              <p className="mt-1 text-muted">Une seule session par an, en fin d&apos;année scolaire.</p>
            </li>
          </ul>
          <div className="mt-4">
            <SourceLink source={data.sources.decret2021} />
          </div>
        </div>

        <h2 className="t-h1 mt-16">Où voir tes résultats ?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[data.sources.resultats, data.sources.mesupres].filter(Boolean).map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-4 rounded-3xl border border-line bg-raised p-6 shadow-sm hover:border-vert"
            >
              <span>
                <span className="t-h3 block group-hover:text-vert">{s.label}</span>
                <span className="mt-1 block text-sm text-muted">{s.url.replace("https://", "")}</span>
              </span>
              <ExternalLink className="size-6 shrink-0 text-vert" aria-hidden />
            </a>
          ))}
        </div>
        <p className="mt-3 text-muted">
          Les universités de chaque province publient aussi les listes d&apos;admis, au fil des corrections.
        </p>

        <h2 className="t-h1 mt-16">Après le Bacc</h2>
        <div className="mt-6">
          <TipGrid tips={data.tips.filter((t) => t.category === "apres")} />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {data.series.map((s) => {
            const Art = SERIE_ART[s.code];
            return (
              <Link
                key={s.code}
                href={`/guide/series#${s.code}`}
                className="group flex items-center gap-4 rounded-3xl border border-line bg-raised p-4 shadow-sm hover:border-vert"
              >
                <span className="w-24 shrink-0">
                  <Art />
                </span>
                <span>
                  <span className="block font-bold group-hover:text-vert">Après une série {s.code}</span>
                  <span className="block text-sm text-muted">{s.careers.slice(0, 3).join(", ")}…</span>
                </span>
                <ArrowRight className="ml-auto size-5 shrink-0 text-vert" />
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-4xl bg-info-soft p-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="t-h2">Tu hésites sur ta voie ?</p>
            <p className="mt-1 text-muted">
              L&apos;assistant te présente des options. C&apos;est toi qui choisis.
            </p>
          </div>
          <AskButton
            question="J'ai eu mon Bacc en série OSE. Quelles études puis-je faire ?"
            className={buttonClass.primary}
          >
            <MessageCircleQuestion className="size-5" /> Explorer mes options
          </AskButton>
        </div>
      </Container>
      <GuideNav current="resultats" />
    </>
  );
}
