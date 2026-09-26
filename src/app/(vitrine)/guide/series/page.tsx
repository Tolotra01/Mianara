import type { Metadata } from "next";
import { ArrowRight, Briefcase, Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CoefBars } from "@/components/CoefBars";
import { GuideNav } from "@/components/GuideNav";
import { SERIE_ART, SerieLArt } from "@/components/illustrations/Spots";
import { Breadcrumb, Container, PageHero, SourceLink } from "@/components/ui";
import { SOURCES, TECH_SERIES } from "@/content/bac";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Les séries L, S et OSE",
  description:
    "Littéraire, Scientifique ou Organisation-Société-Économie : matières, coefficients et débouchés de chaque série du Bacc malgache.",
};

const TINT = { L: "bg-mena-soft", S: "bg-vert-soft", OSE: "bg-soleil-soft" } as const;

export default async function SeriesPage() {
  const data = await getBacData();

  return (
    <>
      <PageHero
        overline="Guide · 1"
        title="Trois séries, trois chemins"
        lead="Dès le Bacc 2027, tu choisis entre L, S et OSE. Une seule série par an."
        art={<SerieLArt />}
      >
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
              Série {s.code}
            </a>
          ))}
        </div>
      </PageHero>

      <Container className="pt-6 sm:pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Les séries" }]} />

        {/* ✅ CORRECTION 2 : padding responsive + gap ajusté */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-info-soft p-4 text-info sm:mt-5 sm:gap-4 sm:p-5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold sm:text-base">
              Les séries A, C et D disparaissent au Bacc 2027.
            </p>
            <p className="mt-1 text-sm text-ink sm:text-base">
              L remplace A1 et A2, S remplace C et D. Des mesures de transition protègent les élèves de
              l&apos;ancien système.
            </p>
            <div className="mt-2">
              <SourceLink source={data.sources.suppressionACD} />
            </div>
          </div>
        </div>
      </Container>

      {/* ✅ CORRECTION 3 : espacement vertical réduit sur mobile */}
      <Container className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
        {data.series.map((s) => {
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
                  <h2 className="t-h1 mt-3 text-balance sm:mt-4">{s.name}</h2>
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
                    <h3 className="t-overline text-muted">Pour toi si…</h3>
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

                    <h3 className="t-overline mt-7 text-muted sm:mt-8">Et après ?</h3>
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
                    <h3 className="t-overline text-muted">Coefficients en terminale</h3>
                    <div className="mt-4">
                      <CoefBars items={coefs} />
                    </div>
                    <Link
                      href={`/guide/coefficients?serie=${s.code}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-vert hover:underline sm:mt-6 sm:text-base"
                    >
                      Calculer ma moyenne en série {s.code} <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <SourceLink source={data.sources.coefficients2027} />

        {/* ---------- Bac technique ---------- */}
        {/* ✅ CORRECTION 10 : padding + titre responsive */}
        <section className="rounded-3xl border border-line bg-raised p-6 shadow-sm sm:rounded-4xl sm:p-8">
          <p className="t-overline text-mena">Et le Bac technique ?</p>
          <h2 className="t-h1 mt-2 text-balance">Quatre secteurs, un métier au bout</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
            Le Bac technologique se prépare en trois ans après le BEPC, dans les lycées techniques du
            Ministère de l&apos;Enseignement technique et de la Formation professionnelle.
          </p>

          {/* ✅ CORRECTION 11 : grille progressive 1 → 2 → 3 → 4.
              Le passage direct à 4 colonnes laissait les cartes trop étroites
              sur tablette entre 768 et 1024px. */}
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {TECH_SERIES.map((t) => (
              <li key={t.code} className="rounded-2xl bg-sunken p-4 sm:p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-raised text-sm font-extrabold text-vert shadow-sm sm:size-12 sm:text-base">
                  {t.code}
                </span>
                <p className="t-h3 mt-3">{t.name}</p>
                <p className="mt-1 text-xs text-muted sm:text-sm">{t.careers.join(", ")}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <SourceLink source={SOURCES.metfp} />
          </div>
        </section>
      </Container>

      <GuideNav current="series" />
    </>
  );
}