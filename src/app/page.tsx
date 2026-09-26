import {
  ArrowRight,
  BookOpen,
  Compass,
  FolderCheck,
  GraduationCap,
  MessageCircleQuestion,
  PencilLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AskButton } from "@/components/assistant/AskButton";
import { HeroScene } from "@/components/illustrations/HeroScene";
import { AssistantArt, SERIE_ART } from "@/components/illustrations/Spots";
import { NewsCard } from "@/components/NewsCard";
import { buttonClass, ButtonLink, Container, SectionTitle } from "@/components/ui";
import { getBacData, getNews } from "@/lib/data";
import { getDict } from "@/lib/lang";

/* Les pastilles des étapes portent leur texte en `text-ink` (et non `text-white`) :
   sur la page nuit, le tany-mena et le bleu d'information sont des teintes
   claires — du blanc dessus disparaîtrait. */
const JOURNEY = [
  { href: "/guide/series", icon: Compass, color: "bg-vert text-on-vert" },
  { href: "/guide/dossier", icon: FolderCheck, color: "bg-soleil text-ink" },
  { href: "/guide/preparer", icon: BookOpen, color: "bg-mena text-ink" },
  { href: "/guide/jour-j", icon: PencilLine, color: "bg-info text-ink" },
  { href: "/guide/resultats", icon: GraduationCap, color: "bg-ink text-surface" },
];

/** Accent de marque par série : L = tany-mena, S = vert, OSE = soleil. */
const SERIE_ACCENT = {
  L: { text: "text-mena", bar: "bg-mena", plate: "plate-l" },
  S: { text: "text-vert", bar: "bg-vert", plate: "plate-s" },
  OSE: { text: "text-soleil", bar: "bg-soleil", plate: "plate-ose" },
} as const;

/** Coins du viseur qui encadrent le portrait de l'assistant. */
const CORNERS = [
  "left-3 top-3 rounded-tl-xl border-t-2 border-l-2",
  "right-3 top-3 rounded-tr-xl border-t-2 border-r-2",
  "left-3 bottom-3 rounded-bl-xl border-b-2 border-l-2",
  "right-3 bottom-3 rounded-br-xl border-b-2 border-r-2",
] as const;

export default async function HomePage() {
  const [{ t }, data, news] = await Promise.all([getDict(), getBacData(), getNews(3)]);

  return (
    // « Nuit malgache » : l'accueil est sombre dans les deux thèmes — `.home-dark`
    // réimpose les tokens du thème sombre sur toute la page. Les illustrations,
    // elles, restent sur des plaques claires (cf. `.plate` dans globals.css) :
    // c'est ce contraste qui les fait ressortir.
    <div className="home-dark relative isolate">
      {/* ---------- Héros ---------- */}
      <section className="hero-band relative isolate overflow-hidden bg-surface">
        {/* Panorama : colline lointaine, rizières en terrasses, route de latérite
            et ravinala couvrent toute la largeur. Bande basse sur mobile pour
            laisser la place au titre, plein cadre à partir de lg. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[240px] sm:h-[300px] lg:inset-0 lg:h-auto">
          <HeroScene />
        </div>
        {/* Voile de lisibilité : le titre, le chapô et les boutons se posent sur
            le calme de la partie gauche. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(96deg, rgba(9,26,21,0.95) 0%, rgba(9,26,21,0.88) 30%, rgba(9,26,21,0.55) 52%, rgba(9,26,21,0.18) 70%, rgba(9,26,21,0) 86%)",
          }}
        />
        <Container className="relative pt-10 pb-[280px] sm:pb-[340px] lg:flex lg:min-h-[620px] lg:items-center lg:py-16 lg:pb-16">
          <div className="a-pop max-w-xl">
            <p className="t-display py-1">{t.hero.mini}</p>
            <h1 className="t-display mt-5 inline-flex px-3 text-warning">
                {t.hero.overline}
            </h1>
            <p className="t-display text-balance">{t.hero.title}</p>
            <p className="t-body-lg mt-5 max-w-md text-muted">{t.hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/guide">
                {t.hero.ctaGuide} <ArrowRight className="size-5" />
              </ButtonLink>
              <AskButton className={buttonClass.secondary}>
                <MessageCircleQuestion className="size-5" /> {t.hero.ctaAssistant}
              </AskButton>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Parcours en 5 étapes ---------- */}
      <section className="journey-band overflow-hidden py-20">
        <Container>
          <SectionTitle overline={t.journey.overline} title={t.journey.title} center />

          <div className="relative mt-16">
            {/* Filet du parcours : relie les cinq cartes d'un même trait. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 bg-linear-to-r from-transparent via-line-strong/50 to-transparent lg:block"
            />
            <ol className="relative flex flex-wrap justify-center gap-6 lg:gap-0 lg:-space-x-6">
              {JOURNEY.map((step, i) => {
                const rotations = ["-rotate-6", "-rotate-3", "rotate-0", "rotate-3", "rotate-6"];
                const offsets = [
                  "lg:translate-y-6",
                  "lg:translate-y-2",
                  "lg:-translate-y-2",
                  "lg:translate-y-2",
                  "lg:translate-y-6",
                ];

                return (
                  <li
                    key={step.href}
                    className={`relative transition-all duration-300 hover:z-20 hover:-translate-y-4 hover:rotate-0 hover:scale-105 ${rotations[i]} ${offsets[i]}`}
                  >
                    <Link
                      href={step.href}
                      className="group flex h-64 w-48 flex-col items-center justify-between rounded-3xl border border-line/70 bg-raised/70 p-6 text-center shadow-lg backdrop-blur-sm transition-colors hover:border-vert/60 hover:bg-raised hover:shadow-2xl"
                    >
                      {/* Numéro en haut, en mono : le repère devient un index. */}
                      <span className="self-start font-mono text-4xl font-black text-line-strong/70">
                        {i + 1}
                      </span>

                      {/* Icône centrale */}
                      <span className={`grid size-16 place-items-center rounded-2xl shadow-sm ${step.color}`}>
                        <step.icon className="size-8" strokeWidth={1.8} />
                      </span>

                      {/* Texte */}
                      <span className="t-h3 transition-colors group-hover:text-vert">
                        {t.journey.steps[i]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </Container>
      </section>

      {/* ---------- Séries ---------- */}
      <section className="py-20">
        <Container>
          <SectionTitle overline={t.series.overline} title={t.series.title} />
          <div className="grid gap-6 md:grid-cols-3">
            {data.series.map((s) => {
              const Art = SERIE_ART[s.code];
              const accent = SERIE_ACCENT[s.code];
              const core = data.coefficients.filter((c) => c.serieCode === s.code && c.isCore);
              return (
                <Link
                  key={s.code}
                  href={`/guide/series#${s.code}`}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-line/70 bg-raised/45 p-5 shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-vert/50 hover:bg-raised/70 hover:shadow-xl"
                >
                  {/* Filet de couleur : l'accent de la voie, en tête de carte. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-5 top-0 h-1 rounded-b-full ${accent.bar} opacity-70 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  {/* Code de série, et flèche qui se redresse au survol. */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`font-mono text-2xl font-extrabold tracking-[0.16em] ${accent.text}`}>
                      {s.code}
                    </span>
                    <span className="grid size-9 place-items-center rounded-full border border-line/70 text-muted transition-all duration-300 group-hover:border-vert group-hover:bg-vert group-hover:text-on-vert">
                      <ArrowRight className="size-4 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                    </span>
                  </div>

                  {/* Plaque lumineuse : c'est elle qui détache l'illustration de la
                      page nuit (cf. `.plate` dans globals.css). */}
                  <div className={`plate ${accent.plate} relative mt-5 overflow-hidden rounded-2xl px-3 pt-2`}>
                    {/* Lettre géante en filigrane : la voie se reconnaît d'un coup d'œil. */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-2 -bottom-9 select-none font-mono text-[8rem] font-extrabold leading-none text-ink/5 transition-transform duration-500 group-hover:-translate-y-2"
                    >
                      {s.code}
                    </span>
                    <Art className="relative w-full transition-transform duration-500 group-hover:scale-[1.07]" />
                  </div>

                  <h3 className="t-h2 mt-5">{s.name}</h3>
                  <p className="mt-1.5 text-muted">{s.tagline}</p>

                  <p className="t-overline mt-6 flex items-center gap-3 text-muted">
                    {t.series.core}
                    <span aria-hidden className="h-px flex-1 bg-line" />
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {core.map((c) => (
                      <li
                        key={c.subjectCode}
                        className="rounded-full border border-line/70 bg-sunken/70 px-3 py-1 text-sm font-semibold"
                      >
                        {c.subjectName}
                      </li>
                    ))}
                  </ul>

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-vert">
                    {t.series.more}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ---------- Chiffres clés ---------- */}
      <section className="py-8">
        <Container>
          <div className="figures-band px-6 py-14 sm:px-10 lg:px-14">
            <div className="relative text-center">
              <p className="t-overline text-soleil">{t.figures.overline}</p>
              <h2 className="t-h1 mt-3 text-balance">{t.figures.title}</h2>
            </div>

            {/* `gap-px` sur un fond clair dessine les filets entre les tuiles :
                un tableau d'affichage, et non une rangée de pastilles. */}
            <dl className="relative mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
              {t.figures.items.map((f, i) => (
                <div
                  key={f.label}
                  className="flex flex-col items-center bg-surface px-4 py-9 text-center transition-colors duration-300 hover:bg-raised"
                >
                  <dd className="bg-linear-to-br from-ink via-ink to-ink/40 bg-clip-text font-mono text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                    {f.value}
                  </dd>
                  <dt className="t-overline mt-3 text-ink/65">{f.label}</dt>
                  <span
                    aria-hidden
                    className={`mt-5 block h-1 w-10 rounded-full ${i === 3 ? "bg-mena" : "bg-vert"}`}
                  />
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* ---------- Assistant ---------- */}
      <section className="relative py-20">
        <Container className="grid items-center gap-14 md:grid-cols-2 md:gap-10">
          {/* Portrait encadré : halo, plaque lumineuse, coins de viseur et
              pastille « en ligne ». L'image devient une vignette présentée,
              plutôt qu'un dessin flottant sur la section. */}
          <div className="relative isolate mx-auto w-full max-w-md">
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-vert/25 blur-3xl"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-raised/45 p-2.5 shadow-xl backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1.5">
              {CORNERS.map((corner) => (
                <span key={corner} aria-hidden className={`absolute z-10 size-8 border-vert/45 ${corner}`} />
              ))}
              <div className="plate plate-plain overflow-hidden rounded-[1.5rem] px-5 pt-8 pb-4">
                <AssistantArt />
              </div>
              <div className="flex items-center justify-between gap-3 px-3 pt-4 pb-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/70 px-3 py-1.5 text-xs font-bold text-ink backdrop-blur">
                  <span className="a-pulse size-2 rounded-full bg-vert" aria-hidden />
                  {t.chat.title}
                </span>
                <span className="font-mono text-xs tracking-[0.18em] text-muted">FR · MG</span>
              </div>
            </div>
          </div>
          <div>
            <p className="t-overline text-mena">{t.assistant.overline}</p>
            <h2 className="t-h1 mt-2 text-balance">{t.assistant.title}</h2>
            <p className="t-body-lg mt-3 text-muted">{t.assistant.lead}</p>
            <ul className="mt-7 space-y-3">
              {t.assistant.examples.map((q) => (
                <li key={q}>
                  <AskButton
                    question={q}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-raised/45 px-4 py-3.5 text-left font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-vert/60 hover:bg-raised/80 hover:shadow-md"
                  >
                    <MessageCircleQuestion className="size-5 shrink-0 text-vert" />
                    <span className="flex-1">{q}</span>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-vert" />
                  </AskButton>
                </li>
              ))}
            </ul>
            <AskButton className={`${buttonClass.primary} mt-7`}>
              <Sparkles className="size-5" /> {t.assistant.cta}
            </AskButton>
          </div>
        </Container>
      </section>

      {/* ---------- Actualités ---------- */}
      <section className="news-band py-20">
        <Container>
          <SectionTitle
            overline={t.news.overline}
            title={t.news.title}
            action={
              <ButtonLink href="/actualites" variant="secondary">
                {t.news.all} <ArrowRight className="size-4" />
              </ButtonLink>
            }
          />
          {/* La plus récente occupe toute la largeur : l'accueil s'ouvre sur une
              mise en avant, au lieu d'une rangée de trois cartes égales. */}
          <div className="grid gap-6 lg:grid-cols-2">
            {news.map((n, i) => (
              <div key={n.slug} className={i === 0 ? "lg:col-span-2" : undefined}>
                <NewsCard news={n} tone="dark" featured={i === 0} readLabel={t.news.read} />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
