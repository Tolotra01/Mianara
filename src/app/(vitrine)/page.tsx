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
import { Reveal } from "@/components/Reveal";
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(220px,62vw,360px)] lg:inset-0 lg:h-auto">
          <HeroScene framing="mobile" className="lg:hidden" />
          <HeroScene framing="wide" className="hidden lg:block" />
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
        {/* Mobile et tablette : le texte, puis le décor en bande basse (le `pb`
            lui réserve sa hauteur, plus un peu d'air sous les boutons) ;
            sur tablette le texte est centré pour occuper la largeur. Dès lg, le
            décor couvre tout le cadre et le texte se pose sur le voile. */}
        <Container className="relative pt-10 pb-[clamp(252px,70vw,396px)] md:pt-16 md:text-center lg:flex lg:min-h-[640px] lg:items-center 2xl:min-h-[720px] lg:py-16 lg:text-left">
          {/* Hiérarchie à trois paliers : « Obtenir » en retrait, « Ton Bacc, »
              en grand — c'est le mot promis, il porte l'accent — puis
              « Pas à pas. » en retrait. */}
          <div className="a-pop max-w-xl md:mx-auto md:max-w-2xl lg:mx-0">
            <p className="text-[clamp(26px,4.2vw,44px)] 3xl:text-[clamp(44px,2.8vw,56px)] leading-tight font-extrabold tracking-[-0.02em] text-ink/70">
              {t.hero.mini}
            </p>
            <h1 className="mt-2 text-[clamp(50px,9vw,84px)] 3xl:text-[clamp(84px,5.4vw,112px)] leading-[1.02] font-extrabold tracking-[-0.03em] text-warning">
              {t.hero.overline}
            </h1>
            <p className="t-display mt-1 text-balance text-ink/75">{t.hero.title}</p>
            <p className="t-body-lg mt-5 max-w-md text-muted md:mx-auto lg:mx-0">{t.hero.lead}</p>
            <div className="mt-8 grid gap-3 min-[420px]:flex min-[420px]:flex-wrap md:justify-center lg:justify-start">
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
      {/* `pt-12` et non `py-20` : le bandeau remonte sous le héros au lieu de
          laisser une respiration qui ressemble à un vide. */}
      <section className="journey-band overflow-hidden pt-12 pb-20">
        <Container>
          {/* La section est révélée d'un bloc : le titre est donc désactivé
              individuellement (`animate={false}`) pour éviter un double
              mouvement. */}
          <Reveal>
            <SectionTitle overline={t.journey.overline} title={t.journey.title} center animate={false} />

            <div className="relative mt-16">
              {/* Filet du parcours : relie les cinq cartes d'un même trait. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 bg-linear-to-r from-transparent via-line-strong/50 to-transparent lg:block"
              />
              <ol className="relative grid grid-cols-2 justify-items-center gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-6 lg:flex lg:flex-wrap lg:justify-center lg:gap-0 lg:-space-x-6">
                {JOURNEY.map((step, i) => {
                  const rotations = [
                    "lg:-rotate-6",
                    "lg:-rotate-3",
                    "lg:rotate-0",
                    "lg:rotate-3",
                    "lg:rotate-6",
                  ];
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
                      className={`relative w-full max-w-48 transition-all duration-300 hover:z-20 hover:-translate-y-4 hover:rotate-0 hover:scale-105 ${rotations[i]} ${offsets[i]} ${i === 4 ? "col-span-2 sm:col-span-1 sm:col-start-2" : ""}`}
                    >
                      <Link
                        href={step.href}
                        className="group flex h-64 w-full flex-col items-center justify-between rounded-3xl border border-line/70 bg-raised/70 p-6 text-center shadow-lg backdrop-blur-sm transition-colors hover:border-vert/60 hover:bg-raised hover:shadow-2xl lg:w-48"
                      >
                        {/* Numéro en haut, en mono : le repère devient un index. */}
                        <span className="self-start font-mono text-4xl font-black text-line-strong/70">
                          {i + 1}
                        </span>

                        {/* Icône centrale */}
                        <span
                          className={`grid size-16 place-items-center rounded-2xl shadow-sm ${step.color}`}
                        >
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
          </Reveal>
        </Container>
      </section>

      {/* ---------- Séries ---------- */}
      <section className="py-20">
        <Container>
          <SectionTitle overline={t.series.overline} title={t.series.title} animate={false} />
          {/* 110 ms de décalage par carte : les trois voies arrivent l'une après
              l'autre, comme un choix que l'on parcourt. */}
          {/* Sous lg, les trois cartes défilent à l'horizontale : la carte
              suivante dépasse du bord pour inviter à glisser, et les trois
              gardent la même hauteur. À partir de lg, grille de trois. */}
          <div
            aria-label={t.series.title}
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-2 pb-6 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {data.series.map((s, i) => {
              const Art = SERIE_ART[s.code];
              const accent = SERIE_ACCENT[s.code];
              const core = data.coefficients.filter((c) => c.serieCode === s.code && c.isCore);
              return (
                <Reveal
                  key={s.code}
                  delay={i * 110}
                  className="w-[84%] max-w-[380px] shrink-0 snap-start sm:w-[58%] md:w-[44%] lg:w-auto lg:max-w-none"
                >
                  <Link
                    href={`/guide/series#${s.code}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line/70 bg-raised/45 shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-vert/50 hover:bg-raised/70 hover:shadow-xl"
                  >
                    {/* Rail d'accent à gauche : il descend depuis le haut au survol. */}
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 w-1 origin-top scale-y-0 transition-transform duration-500 group-hover:scale-y-100 ${accent.bar}`}
                    />

                    {/* Plaque pleine largeur : l'illustration jaillit de la carte au
                        lieu d'être posée dans un cadre intérieur. Le rapport 4:3
                        est celui du viewBox des Spots — le SVG garde son
                        `h-auto` et remplit donc la plaque sans recadrage. Sur
                        téléphone, plaque plus basse et dessin réduit à 86 % pour
                        raccourcir la carte sans rogner l'illustration. */}
                    <div
                      className={`plate ${accent.plate} relative flex aspect-[16/11] w-full items-center justify-center overflow-hidden sm:aspect-[4/3]`}
                    >
                      {/* Code géant en filigrane, centré derrière le dessin. */}
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 grid place-items-center font-mono text-[7rem] font-extrabold leading-none opacity-10 transition-transform duration-700 group-hover:scale-110 ${accent.text}`}
                      >
                        {s.code}
                      </span>
                      <Art className="relative w-[86%] transition-transform duration-700 group-hover:scale-105 sm:w-full" />
                    </div>

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`font-mono text-xs font-bold tracking-[0.2em] uppercase ${accent.text}`}
                          >
                            {s.code}
                          </p>
                          <h3 className="mt-1.5 text-xl leading-7 font-bold text-balance sm:t-h2">{s.name}</h3>
                        </div>
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line/70 text-muted transition-all duration-300 group-hover:border-vert group-hover:bg-vert group-hover:text-on-vert">
                          <ArrowRight className="size-4 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                        </span>
                      </div>
                      <p className="mt-2 text-muted">{s.tagline}</p>

                      <p className="t-overline mt-6 text-muted">{t.series.core}</p>
                      <ul className="mt-2.5 flex flex-wrap gap-2">
                        {core.map((c) => (
                          <li
                            key={c.subjectCode}
                            className="rounded-full border border-line/70 bg-sunken/70 px-2.5 py-1 text-[13px] font-semibold sm:px-3 sm:text-sm"
                          >
                            {c.subjectName}
                          </li>
                        ))}
                      </ul>

                      {/* L'appel se prolonge par un filet qui s'allume au survol. */}
                      <span className="mt-auto flex items-center gap-3 pt-6">
                        <span className="text-sm font-bold text-vert">{t.series.more}</span>
                        <span
                          aria-hidden
                          className="h-px flex-1 bg-line transition-colors duration-500 group-hover:bg-vert/50"
                        />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ---------- Chiffres clés ---------- */}
      <section className="py-8">
        <Container>
          <Reveal>
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
          </Reveal>
        </Container>
      </section>

      {/* ---------- Assistant ---------- */}
      <section className="relative overflow-x-clip py-20">
        <Container className="grid items-center gap-14 md:grid-cols-2 md:gap-10">
          {/* Portrait encadré : halo, plaque lumineuse, coins de viseur et
              pastille « en ligne ». L'image devient une vignette présentée,
              plutôt qu'un dessin flottant sur la section. Le texte arrive
              90 ms après le portrait : on regarde l'assistant avant de lire. */}
          <Reveal className="mx-auto w-full max-w-md">
            <div className="relative isolate">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-vert/25 blur-3xl"
              />
              <div className="relative overflow-hidden rounded-[2rem] border border-line/70 bg-raised/45 p-2.5 shadow-xl backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1.5">
                {CORNERS.map((corner) => (
                  <span
                    key={corner}
                    aria-hidden
                    className={`absolute z-10 size-8 border-vert/45 ${corner}`}
                  />
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
          </Reveal>
          <Reveal delay={90}>
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
          </Reveal>
        </Container>
      </section>

      {/* ---------- Actualités ---------- */}
      <section className="news-band py-20">
        <Container>
          <Reveal>
            <SectionTitle
              overline={t.news.overline}
              title={t.news.title}
              animate={false}
              action={
                <ButtonLink href="/actualites" variant="secondary">
                  {t.news.all} <ArrowRight className="size-4" />
                </ButtonLink>
              }
            />
            {/* « Fil » : les actualités se lisent comme une liste de presse — une
                ligne par entrée, séparées d'un filet, la plus récente en tête —
                plutôt que comme une grille de cartes. */}
            <div className="rounded-3xl border border-line/60 bg-raised/25 px-5 sm:px-7">
              {news.map((n) => (
                <NewsCard key={n.slug} news={n} tone="dark" variant="row" readLabel={t.news.read} />
              ))}
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
