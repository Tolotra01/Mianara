import type { Metadata } from "next";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Clock,
  Cog,
  HardHat,
  Layers,
  School,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { CoefBars } from "@/components/CoefBars";
import { GuideNav } from "@/components/GuideNav";
import { SERIE_ART } from "@/components/illustrations/Spots";
import { Breadcrumb, Container, FrenchOnlyNote, PageHero, SourceLink } from "@/components/ui";
import { SOURCES, TECH_SERIES, type TechSerieCode } from "@/content/bac";
import { getBacData } from "@/lib/data";
import { COMMON } from "@/lib/i18n";
import { serieName, serieText } from "@/lib/i18n-content";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Les séries L, S et OSE",
  description:
    "Littéraire, Scientifique ou Organisation-Société-Économie : matières, coefficients et débouchés de chaque série du Bacc malgache.",
};

const TINT = { L: "bg-mena-soft", S: "bg-vert-soft", OSE: "bg-soleil-soft" } as const;

/** Icône et couleur de chaque secteur du Bacc technique. */
const TECH_LOOK: Record<TechSerieCode, { Icon: typeof Cog; tile: string; text: string }> = {
  TI: { Icon: Cog, tile: "bg-info-soft text-info", text: "text-info" },
  TGC: { Icon: HardHat, tile: "bg-mena-soft text-mena", text: "text-mena" },
  TT: { Icon: Building2, tile: "bg-soleil-soft text-soleil", text: "text-soleil" },
  TA: { Icon: Sprout, tile: "bg-vert-soft text-vert", text: "text-vert" },
};

const T = {
  fr: {
    overline: "Guide · 1",
    title: "Trois séries, trois chemins",
    accent: "trois chemins",
    lead: "Dès le Bacc 2027, tu choisis entre L, S et OSE. Une seule série par an.",
    crumb: "Les séries",
    acdTitle: "Les séries A, C et D disparaissent au Bacc 2027.",
    acdBody:
      "L remplace A1 et A2, S remplace C et D. Des mesures de transition protègent les élèves de l'ancien système.",
    forWhom: "Pour toi si…",
    after: "Et après ?",
    coefs: "Coefficients en terminale",
    simulate: "Calculer ma moyenne en série",
    techOverline: "Et le Bacc technique ?",
    techTitle: "Quatre secteurs, un métier au bout",
    techLead:
      "Le Bacc technologique se prépare dans les lycées techniques du Ministère de l'Enseignement technique et de la Formation professionnelle.",
    facts: [
      { Icon: Clock, label: "Durée", value: "3 ans après le BEPC" },
      { Icon: School, label: "Où", value: "Lycées techniques (METFP)" },
      { Icon: Layers, label: "Secteurs", value: "Industriel, génie civil, tertiaire, agricole" },
    ],
  },
  mg: {
    overline: "Torolalana · 1",
    title: "Andiany telo, lalana telo",
    accent: "lalana telo",
    lead: "Manomboka amin'ny Bacc 2027, misafidy eo amin'ny L, S sy OSE ianao. Andiany iray ihany isan-taona.",
    crumb: "Ny andiany",
    acdTitle: "Foanana amin'ny Bacc 2027 ny andiany A, C sy D.",
    acdBody:
      "Ny L no misolo ny A1 sy A2, ny S no misolo ny C sy D. Misy fepetra tetezamita miaro ireo mpianatra tamin'ny rafitra taloha.",
    forWhom: "Ho anao raha…",
    after: "Ary avy eo ?",
    coefs: "Coefficient amin'ny kilasy farany",
    simulate: "Kajio ny salan'isako amin'ny andiany",
    techOverline: "Ary ny Bacc teknika ?",
    techTitle: "Sehatra efatra, asa iray any am-piafarana",
    techLead:
      "Any amin'ny lycée teknika an'ny Ministeran'ny Fampianarana teknika sy ny Fanofanana arak'asa no iomanana ny Bacc teknolojika.",
    facts: [
      { Icon: Clock, label: "Faharetana", value: "3 taona aorian'ny BEPC" },
      { Icon: School, label: "Aiza", value: "Lycée teknika (METFP)" },
      { Icon: Layers, label: "Sehatra", value: "Indostrialy, fanorenana, varotra sy fitantanana, fambolena" },
    ],
  },
};

export default async function SeriesPage() {
  const [data, lang] = await Promise.all([getBacData(), getLang()]);
  const tr = T[lang];

  return (
    <>
      <PageHero overline={tr.overline} title={tr.title} accent={tr.accent} lead={tr.lead} scene="series">
        {/* ✅ CORRECTION 1 : pastilles scrollables horizontalement sur mobile,
            wrap normal dès sm. Évite le débordement si les 3 séries + padding
            dépassent la largeur de l'écran. */}
        <div className="mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {data.series.map((s) => (
            <a
              key={s.code}
              href={`#${s.code}`}
              className="shrink-0 rounded-full border border-line-strong bg-raised px-4 py-2 text-sm font-bold hover:border-vert hover:text-vert sm:text-base"
            >
              {COMMON[lang].series} {s.code}
            </a>
          ))}
        </div>
      </PageHero>

      <Container className="pt-6 sm:pt-8">
        <Breadcrumb
          lang={lang}
          items={[{ href: "/guide", label: COMMON[lang].guide }, { label: tr.crumb }]}
        />

        {/* ✅ CORRECTION 2 : padding responsive + gap ajusté */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-info-soft p-4 text-info sm:mt-5 sm:gap-4 sm:p-5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold sm:text-base">{tr.acdTitle}</p>
            <p className="mt-1 text-sm text-ink sm:text-base">{tr.acdBody}</p>
            <div className="mt-2">
              <SourceLink lang={lang} source={data.sources.suppressionACD} />
            </div>
          </div>
        </div>
        <FrenchOnlyNote lang={lang} />
      </Container>

      {/* ✅ CORRECTION 3 : espacement vertical réduit sur mobile */}
      <Container className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
        {data.series.map((serie) => {
          const s = serieText(serie, lang);
          const Art = SERIE_ART[s.code];
          const coefs = data.coefficients.filter((c) => c.serieCode === s.code);
          return (
            <section
              key={s.code}
              id={s.code}
              className="scroll-mt-20 overflow-hidden rounded-3xl border border-line bg-raised shadow-sm sm:scroll-mt-24 sm:rounded-4xl"
            >
              {/* ✅ CORRECTION 4 : grille responsive en 3 paliers.
                  - Mobile : 1 colonne (tint en haut, contenu en dessous)
                  - md : 1 colonne aussi mais avec plus d'espace (le contenu reste lisible)
                  - lg : 2 colonnes 2fr/3fr comme avant
                  Évite le saut brutal 1 → 2 à lg uniquement. */}
              <div className="grid lg:grid-cols-[2fr_3fr]">
                {/* Bloc teinté (couleur de la série) */}
                <div className={`flex flex-col p-6 sm:p-8 ${TINT[s.code]}`}>
                  {/* ✅ CORRECTION 5 : badge plus petit sur mobile */}
                  <span className="grid size-12 place-items-center rounded-xl bg-raised text-xl font-extrabold text-vert shadow-sm sm:size-16 sm:rounded-2xl sm:text-2xl">
                    {s.code}
                  </span>

                  {/* ✅ CORRECTION 6 : titre responsive (débordement évité) */}
                  <h2 className="t-h1 mt-3 text-balance sm:mt-4">{serieName(s.code, s.name, lang)}</h2>
                  <p className="t-body-lg mt-1 text-muted">{s.tagline}</p>

                  {/* ✅ CORRECTION 7 : pill en `inline-flex` + `max-w-full` */}
                  <p className="mt-3 inline-flex w-fit max-w-full rounded-full bg-raised/70 px-3 py-1 text-xs font-semibold sm:text-sm">
                    {s.formerOptions}
                  </p>

                  {/* ✅ CORRECTION 8 : illustration plus petite sur mobile */}
                  <div className="mx-auto mt-auto w-full max-w-[200px] pt-6 sm:max-w-xs">
                    <Art />
                  </div>
                </div>

                {/* Contenu principal (Pour toi si / Coefficients) */}
                {/* ✅ CORRECTION 9 : padding responsive + gap ajusté.
                    Sur mobile : 1 colonne. Sur sm et + : 2 colonnes. */}
                <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-2">
                  <div>
                    <h3 className="t-overline text-muted">{tr.forWhom}</h3>
                    <ul className="mt-3 space-y-2.5">
                      {s.forWhom.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm font-semibold sm:text-base">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-vert text-on-vert sm:size-7">
                            <Check className="size-3.5 sm:size-4" aria-hidden />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <h3 className="t-overline mt-7 text-muted sm:mt-8">{tr.after}</h3>
                    <ul className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      {s.careers.map((c) => (
                        <li
                          key={c}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm"
                        >
                          <Briefcase className="size-3.5 text-mena sm:size-4" aria-hidden />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="t-overline text-muted">{tr.coefs}</h3>
                    <div className="mt-4">
                      <CoefBars items={coefs} lang={lang} />
                    </div>
                    <Link
                      href={`/guide/coefficients?serie=${s.code}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-vert hover:underline sm:mt-6 sm:text-base"
                    >
                      {tr.simulate} {s.code} <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <SourceLink lang={lang} source={data.sources.coefficients2027} />

        {/* ---------- Bacc technique ---------- */}
        {/* Un panneau à part : introduction et repères à gauche, les quatre
            secteurs à droite, chacun avec son icône, sa couleur et ses métiers. */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-raised p-6 shadow-sm sm:rounded-4xl sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-vert/10 blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1.7fr] lg:gap-12">
            <div>
              <p className="t-overline text-mena">{tr.techOverline}</p>
              <h2 className="t-h1 mt-2 text-balance">{tr.techTitle}</h2>
              <p className="mt-3 max-w-md text-sm text-muted sm:text-base">{tr.techLead}</p>
              <ul className="mt-6 space-y-3">
                {tr.facts.map(({ Icon, label, value }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-vert">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xs text-muted">{label}</span>
                      <span className="block font-bold">{value}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <SourceLink lang={lang} source={SOURCES.metfp} />
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {TECH_SERIES.map((tech) => {
                const t = serieText(tech, lang);
                const look = TECH_LOOK[t.code];
                return (
                  <li
                    key={t.code}
                    className="group relative overflow-hidden rounded-2xl border border-line bg-sunken/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-md"
                  >
                    {/* Code du secteur en filigrane */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -top-3 -right-1 font-mono text-7xl font-black opacity-10 transition-transform duration-500 group-hover:scale-110 ${look.text}`}
                    >
                      {t.code}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${look.tile}`}>
                        <look.Icon className="size-6" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className={`font-mono text-xs font-bold tracking-[0.18em] ${look.text}`}>
                          {t.code}
                        </p>
                        <p className="t-h3 leading-tight">{serieName(t.code, t.name, lang)}</p>
                      </div>
                    </div>
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {t.careers.map((c) => (
                        <li
                          key={c}
                          className="rounded-full border border-line bg-raised px-2.5 py-1 text-xs font-semibold sm:text-sm"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </Container>

      <GuideNav current="series" lang={lang} />
    </>
  );
}
