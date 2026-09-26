import type { Metadata } from "next";
import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Container, PageHero, SectionTitle } from "@/components/ui";
import { GUIDE_SECTIONS, sectionText } from "@/lib/guide";
import { COMMON } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Guide du Bac",
  description:
    "Séries, coefficients, dossier, calendrier, jour J et résultats : le Bac malgache expliqué en images.",
};

/** Teinte de chaque étape : plaque claire de l'illustration et couleur du jalon. */
const TINTS = {
  "bg-mena-soft": { plate: "plate-l", marker: "bg-mena", ring: "ring-mena/30" },
  "bg-vert-soft": { plate: "plate-s", marker: "bg-vert", ring: "ring-vert/30" },
  "bg-soleil-soft": { plate: "plate-ose", marker: "bg-soleil", ring: "ring-soleil/30" },
  "bg-info-soft": { plate: "plate-info", marker: "bg-info", ring: "ring-info/30" },
} as const;

const T = {
  fr: {
    overline: "Guide du Bac",
    title: "Tout le Bac, en sept étapes",
    accent: "en sept étapes",
    lead: "Choisis une rubrique. Chaque page va à l'essentiel.",
    pathOverline: "Le parcours",
    pathTitle: "De la série au diplôme",
    pathLead: "Suis les étapes dans l'ordre, ou va directement à celle qui te concerne.",
    read: "Lire l'étape",
    finish: "Ton Bacc en poche",
    finishLead: "Et une nouvelle route qui commence.",
  },
  mg: {
    overline: "Torolalana momba ny Bacc",
    title: "Ny Bacc manontolo, amin'ny dingana fito",
    accent: "amin'ny dingana fito",
    lead: "Misafidiana fizarana iray. Mankany amin'ny tena ilaina avy hatrany ny pejy tsirairay.",
    pathOverline: "Ny lalana",
    pathTitle: "Hatramin'ny andiany ka hatramin'ny diplaoma",
    pathLead: "Araho araka ny filaharany ireo dingana, na mandehana mivantana any amin'izay mahakasika anao.",
    read: "Vakio ity dingana ity",
    finish: "Azonao ny Bacc-nao",
    finishLead: "Ary lalana vaovao no manomboka.",
  },
};

export default async function GuidePage() {
  const lang = await getLang();
  const t = T[lang];
  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="guide" />

      {/* Le guide est un parcours : les sept étapes sont des jalons le long
          d'une même route, de la série au diplôme. La route court à gauche sur
          mobile, au centre à partir de lg, où les étapes alternent de part et
          d'autre. */}
      <section className="py-16 lg:py-24">
        <Container>
          <SectionTitle overline={t.pathOverline} title={t.pathTitle} lead={t.pathLead} center />

          <ol className="relative mx-auto mt-4 max-w-5xl lg:mt-8">
            {/* La route : un trait en pointillés, du premier jalon à l'arrivée. */}
            <span
              aria-hidden
              className="absolute top-6 bottom-16 left-5 w-1 -translate-x-1/2 rounded-full bg-[repeating-linear-gradient(to_bottom,var(--color-line-strong)_0_10px,transparent_10px_20px)] opacity-60 sm:left-6 lg:bottom-28 lg:left-1/2"
            />

            {GUIDE_SECTIONS.map((s, i) => {
              const tint = TINTS[s.tint];
              const right = i % 2 === 1;
              const text = sectionText(s, lang);
              return (
                <li
                  key={s.slug}
                  className="relative pb-6 pl-12 sm:pb-8 sm:pl-16 lg:grid lg:grid-cols-2 lg:gap-24 lg:pb-4 lg:pl-0"
                >
                  {/* Jalon numéroté, posé sur la route */}
                  <span
                    aria-hidden
                    className={`absolute top-6 left-5 z-10 grid size-10 -translate-x-1/2 place-items-center rounded-full font-mono text-base font-black sm:left-6 sm:size-12 sm:text-lg text-white shadow-md ring-8 ${tint.marker} ${tint.ring} lg:left-1/2`}
                  >
                    {i + 1}
                  </span>
                  {/* Trait qui relie le jalon à sa carte (lg) */}
                  <span
                    aria-hidden
                    className={`absolute top-12 hidden h-px w-12 bg-line-strong/60 lg:block ${right ? "left-1/2" : "right-1/2"}`}
                  />

                  <Reveal delay={i * 60} className={right ? "lg:col-start-2" : "lg:col-start-1"}>
                    <Link
                      href={`/guide/${s.slug}`}
                      className={`group flex items-center gap-4 rounded-3xl border border-line bg-raised p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-vert/50 hover:shadow-md sm:gap-6 sm:p-4 ${right ? "" : "lg:flex-row-reverse lg:text-right"}`}
                    >
                      <div
                        className={`plate ${tint.plate} grid w-20 shrink-0 place-items-center overflow-hidden rounded-2xl sm:w-40 xl:w-44`}
                      >
                        <s.Art className="w-full transition-transform duration-500 group-hover:scale-110" />
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <p className="t-overline text-muted">
                          {COMMON[lang].step} {i + 1}
                        </p>
                        <h2 className="mt-1 text-lg leading-snug font-bold transition-colors group-hover:text-vert sm:t-h2">
                          {text.title}
                        </h2>
                        <p className="mt-1 text-sm text-muted sm:text-base">{text.short}</p>
                        <span
                          className={`mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-vert ${right ? "" : "lg:flex-row-reverse"}`}
                        >
                          {t.read}
                          <ArrowRight
                            className={`size-4 transition-transform duration-300 group-hover:translate-x-1 ${right ? "" : "lg:rotate-180 lg:group-hover:-translate-x-1"}`}
                          />
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              );
            })}

            {/* Arrivée */}
            <li className="relative pt-4 pl-16 sm:pl-20 lg:pl-0 lg:text-center">
              <span
                aria-hidden
                className="absolute top-4 left-5 z-10 grid size-12 sm:left-6 sm:size-14 -translate-x-1/2 place-items-center rounded-full bg-soleil text-on-vert shadow-md ring-8 ring-soleil/25 lg:left-1/2"
              >
                <GraduationCap className="size-7" />
              </span>
              <div className="pt-1 lg:pt-20">
                <p className="t-h3">{t.finish}</p>
                <p className="mt-1 text-muted">{t.finishLead}</p>
              </div>
            </li>
          </ol>
        </Container>
      </section>
    </>
  );
}
