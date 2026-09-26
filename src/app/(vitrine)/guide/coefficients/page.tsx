import type { Metadata } from "next";
import { GuideNav } from "@/components/GuideNav";
import { MoyenneSimulator } from "@/components/MoyenneSimulator";
import { Breadcrumb, Container, PageHero, SourceLink } from "@/components/ui";
import { RULES, type SerieCode } from "@/content/bac";
import { getBacData } from "@/lib/data";
import { COMMON } from "@/lib/i18n";
import { serieName } from "@/lib/i18n-content";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Coefficients et simulateur de moyenne",
  description:
    "Les coefficients de terminale des séries L, S et OSE (total 30) et un simulateur pour calculer ta moyenne au Bacc.",
};

const T = {
  fr: {
    overline: "Guide · 2",
    title: "Le poids de chaque matière",
    accent: "chaque matière",
    lead: "Ta moyenne = somme des (note × coefficient), divisée par la somme des coefficients.",
    crumb: "Coefficients",
    simulate: "Simule ta moyenne",
    rules: [
      { value: "30", label: "coefficients au total, dans chaque série" },
      { value: "5", label: "pour les trois matières de base" },
      { value: "10/20", label: "de moyenne pour être admis" },
      { value: "9,50", label: "seuil minimum si le jury délibère" },
    ],
  },
  mg: {
    overline: "Torolalana · 2",
    title: "Ny lanjan'ny taranja tsirairay",
    accent: "taranja tsirairay",
    lead: "Ny salan'isanao = fitambaran'ny (naoty × coefficient), zaraina amin'ny fitambaran'ny coefficient.",
    crumb: "Coefficient",
    simulate: "Kajio ny salan'isanao",
    rules: [
      { value: "30", label: "fitambaran'ny coefficient, isaky ny andiany" },
      { value: "5", label: "ho an'ireo taranja fototra telo" },
      { value: "10/20", label: "salan'isa ilaina vao afaka" },
      { value: "9,50", label: "fetra ambany indrindra raha midinika ny mpitsara" },
    ],
  },
};

export default async function CoefficientsPage({ searchParams }: PageProps<"/guide/coefficients">) {
  const [data, params, lang] = await Promise.all([getBacData(), searchParams, getLang()]);
  const t = T[lang];
  const asked = typeof params.serie === "string" ? params.serie.toUpperCase() : "";
  const initialSerie = (data.series.some((s) => s.code === asked) ? asked : "S") as SerieCode;

  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="coefficients" />
      <Container className="pt-8">
        <Breadcrumb lang={lang} items={[{ href: "/guide", label: COMMON[lang].guide }, { label: t.crumb }]} />
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {t.rules.map((r) => (
            <div key={r.label} className="rounded-2xl border border-line bg-raised p-5 text-center shadow-sm">
              <dd className="text-3xl font-extrabold text-vert">{r.value}</dd>
              <dt className="mt-1 text-sm font-semibold text-muted">{r.label}</dt>
            </div>
          ))}
        </dl>

        <h2 className="t-h1 mt-14 mb-6">{t.simulate}</h2>
        <MoyenneSimulator
          series={data.series.map((s) => ({ code: s.code, name: serieName(s.code, s.name, lang) }))}
          coefficients={data.coefficients}
          mentions={RULES.mentions}
          admission={RULES.admissionAverage}
          juryFloor={RULES.juryFloor}
          initialSerie={initialSerie}
          lang={lang}
        />
        <div className="mt-4 flex flex-col gap-1">
          <SourceLink lang={lang} source={data.sources.coefficients2027} />
          <SourceLink lang={lang} source={data.sources.decret2021} />
        </div>
      </Container>
      <GuideNav current="coefficients" lang={lang} />
    </>
  );
}
