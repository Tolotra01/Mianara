import type { Metadata } from "next";
import { ArrowRight, ExternalLink, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { AskButton } from "@/components/assistant/AskButton";
import { GuideNav } from "@/components/GuideNav";
import { SERIE_ART } from "@/components/illustrations/Spots";
import { TipGrid } from "@/components/TipGrid";
import { Breadcrumb, buttonClass, Container, FrenchOnlyNote, PageHero, SourceLink } from "@/components/ui";
import { RULES } from "@/content/bac";
import { getBacData } from "@/lib/data";
import { serieText } from "@/lib/i18n-content";
import { COMMON, mentionLabel, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Résultats du Bacc et après",
  description:
    "Moyenne d'admission, mentions, où consulter les résultats du Bacc et comment préparer la suite.",
};

const bands = (lang: Lang) => [
  {
    from: 0,
    to: RULES.juryFloor,
    label: lang === "mg" ? "Tsy afaka" : "Ajourné",
    className: "bg-danger-soft text-danger",
  },
  {
    from: RULES.juryFloor,
    to: RULES.admissionAverage,
    label: lang === "mg" ? "Mpitsara" : "Jury",
    className: "bg-soleil text-ink",
  },
  ...RULES.mentions.map((m, i) => ({
    from: m.min,
    to: m.max,
    label: mentionLabel(m.key, m.label, lang),
    className: [
      "bg-vert-soft text-vert",
      "bg-vert/40 text-ink",
      "bg-vert/70 text-on-vert",
      "bg-vert text-on-vert",
    ][i],
  })),
];

const T = {
  fr: {
    overline: "Guide · 7",
    title: "Résultats, mentions, et la suite",
    accent: "et la suite",
    lead: "10/20 de moyenne pour être admis. Ensuite, place à ton orientation.",
    crumb: "Résultats et après",
    scale: "L'échelle des mentions",
    juryNote: "Entre 9,50 et 10 : le jury peut délibérer.",
    rules: [
      { title: "Admis dès 10/20", text: "Moyenne générale sur l'ensemble des épreuves." },
      { title: "Le jury peut descendre à 9,50", text: "Jamais en dessous. Sa décision est sans recours." },
      { title: "Pas de rattrapage", text: "Une seule session par an, en fin d'année scolaire." },
    ],
    where: "Où voir tes résultats ?",
    search: "Rechercher un résultat sur Mianara",
    universities:
      "Les universités de chaque province publient aussi les listes d'admis, au fil des corrections.",
    after: "Après le Bacc",
    afterSerie: "Après une série",
    hesitate: "Tu hésites sur ta voie ?",
    hesitateLead: "L'assistant te présente des options. C'est toi qui choisis.",
    question: "J'ai eu mon Bacc en série OSE. Quelles études puis-je faire ?",
    cta: "Explorer mes options",
  },
  mg: {
    overline: "Torolalana · 7",
    title: "Valiny, mention, ary ny manaraka",
    accent: "ary ny manaraka",
    lead: "Salan'isa 10/20 vao afaka. Avy eo, ny fitarihana anao no manaraka.",
    crumb: "Ny valiny sy ny manaraka",
    scale: "Ny ambaratongan'ny mention",
    juryNote: "Eo anelanelan'ny 9,50 sy 10 : afaka midinika ny mpitsara.",
    rules: [
      { title: "Afaka manomboka amin'ny 10/20", text: "Salan'isa ankapoben'ny fanadinana rehetra." },
      {
        title: "Afaka midina hatramin'ny 9,50 ny mpitsara",
        text: "Tsy ambany noho izany mihitsy. Tsy azo iadiana ny fanapahan-keviny.",
      },
      {
        title: "Tsy misy fanadinana fanarenana",
        text: "Indray mandeha monja isan-taona, amin'ny faran'ny taom-pianarana.",
      },
    ],
    where: "Aiza no hijerenao ny valinao ?",
    search: "Hikaroka valiny ao amin'ny Mianara",
    universities:
      "Mamoaka ny lisitr'ireo afaka koa ny oniversitean'ny faritany tsirairay, arakaraka ny fanitsiana.",
    after: "Aorian'ny Bacc",
    afterSerie: "Aorian'ny andiany",
    hesitate: "Misalasala amin'ny lalana horaisinao ?",
    hesitateLead: "Manolotra safidy maromaro ny mpanampy. Ianao no misafidy.",
    question: "Nahazo ny Bacc andiany OSE aho. Inona avy ireo fianarana azoko atao ?",
    cta: "Hijery ny safidiko",
  },
};

export default async function ResultatsPage() {
  const [data, lang] = await Promise.all([getBacData(), getLang()]);
  const t = T[lang];
  const BANDS = bands(lang);
  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="suite" />
      <Container className="pt-8">
        <Breadcrumb lang={lang} items={[{ href: "/guide", label: COMMON[lang].guide }, { label: t.crumb }]} />

        <h2 className="t-h1">{t.scale}</h2>
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
            {t.juryNote}
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {t.rules.map((rule) => (
              <li key={rule.title} className="rounded-2xl bg-sunken p-4">
                <p className="font-bold">{rule.title}</p>
                <p className="mt-1 text-muted">{rule.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <SourceLink lang={lang} source={data.sources.decret2021} />
          </div>
        </div>

        <h2 className="t-h1 mt-16">{t.where}</h2>
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
        <p className="mt-4">
          <Link href="/resultats" className="font-semibold text-vert underline">
            {t.search}
          </Link>
        </p>
        <p className="mt-3 text-muted">{t.universities}</p>

        <h2 className="t-h1 mt-16">{t.after}</h2>
        <FrenchOnlyNote lang={lang} />
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
                  <span className="block font-bold group-hover:text-vert">
                    {t.afterSerie} {s.code}
                  </span>
                  <span className="block text-sm text-muted">
                    {serieText(s, lang).careers.slice(0, 3).join(", ")}…
                  </span>
                </span>
                <ArrowRight className="ml-auto size-5 shrink-0 text-vert" />
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-4xl bg-info-soft p-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="t-h2">{t.hesitate}</p>
            <p className="mt-1 text-muted">{t.hesitateLead}</p>
          </div>
          <AskButton question={t.question} className={buttonClass.primary}>
            <MessageCircleQuestion className="size-5" /> {t.cta}
          </AskButton>
        </div>
      </Container>
      <GuideNav current="resultats" lang={lang} />
    </>
  );
}
