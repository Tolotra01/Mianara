import {
  ArrowRight,
  BookOpen,
  Compass,
  FolderCheck,
  GraduationCap,
  MessageCircleQuestion,
  PencilLine,
} from "lucide-react";
import Link from "next/link";
import { AskButton } from "@/components/assistant/AskButton";
import { HeroScene } from "@/components/illustrations/HeroScene";
import { AssistantArt, SERIE_ART } from "@/components/illustrations/Spots";
import { NewsCard } from "@/components/NewsCard";
import { buttonClass, ButtonLink, Container, SectionTitle } from "@/components/ui";
import { getBacData, getNews } from "@/lib/data";
import { getDict } from "@/lib/lang";

const JOURNEY = [
  { href: "/guide/series", icon: Compass, color: "bg-vert text-on-vert" },
  { href: "/guide/dossier", icon: FolderCheck, color: "bg-soleil text-ink" },
  { href: "/guide/preparer", icon: BookOpen, color: "bg-mena text-white" },
  { href: "/guide/jour-j", icon: PencilLine, color: "bg-info text-white" },
  { href: "/guide/resultats", icon: GraduationCap, color: "bg-ink text-surface" },
];

const SERIE_TINT = {
  L: "bg-mena-soft",
  S: "bg-vert-soft",
  OSE: "bg-soleil-soft",
} as const;

export default async function HomePage() {
  const [{ t }, data, news] = await Promise.all([getDict(), getBacData(), getNews(3)]);

  return (
    <>
      {/* ---------- Héros ---------- */}
      <section className="overflow-hidden">
        <Container className="grid items-center gap-8 pt-10 pb-16 lg:grid-cols-[5fr_7fr] lg:pt-16">
          <div className="a-pop">
            <p className="t-overline inline-flex rounded-full bg-soleil-soft px-3 py-1 text-warning">
              {t.hero.overline}
            </p>
            <h1 className="t-display mt-5 text-balance">{t.hero.title}</h1>
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
          <div
            className="a-pop overflow-hidden rounded-4xl border border-line shadow-md"
            style={{ animationDelay: "0.1s" }}
          >
            <HeroScene />
          </div>
        </Container>
      </section>

      {/* ---------- Parcours en 5 étapes ---------- */}
      <section className="bg-raised py-20">
        <Container>
          <SectionTitle overline={t.journey.overline} title={t.journey.title} center />
          <ol className="relative grid gap-8 sm:grid-cols-5">
            <svg
              className="pointer-events-none absolute top-12 left-[10%] hidden h-8 w-[80%] sm:block"
              viewBox="0 0 800 32"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 16 C100 -8 100 40 200 16 C300 -8 300 40 400 16 C500 -8 500 40 600 16 C700 -8 700 40 800 16"
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth="3"
                strokeDasharray="10 10"
                className="a-dash"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {JOURNEY.map((step, i) => (
              <li key={step.href} className="relative">
                <Link href={step.href} className="group flex flex-col items-center text-center">
                  <span
                    className={`relative grid size-24 place-items-center rounded-full ${step.color} shadow-md ring-8 ring-raised transition-transform group-hover:-translate-y-1 group-hover:rotate-3`}
                  >
                    <step.icon className="size-10" strokeWidth={1.8} />
                    <span className="absolute -top-1 -right-1 grid size-8 place-items-center rounded-full bg-soleil text-sm font-extrabold text-ink ring-4 ring-raised">
                      {i + 1}
                    </span>
                  </span>
                  <span className="t-h3 mt-4 group-hover:text-vert">{t.journey.steps[i]}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- Séries ---------- */}
      <section className="py-20">
        <Container>
          <SectionTitle overline={t.series.overline} title={t.series.title} />
          <div className="grid gap-6 md:grid-cols-3">
            {data.series.map((s) => {
              const Art = SERIE_ART[s.code];
              const core = data.coefficients.filter((c) => c.serieCode === s.code && c.isCore);
              return (
                <Link
                  key={s.code}
                  href={`/guide/series#${s.code}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-raised shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className={`relative px-8 pt-6 ${SERIE_TINT[s.code]}`}>
                    <span className="absolute top-4 left-4 grid size-14 place-items-center rounded-2xl bg-raised text-xl font-extrabold text-vert shadow-sm">
                      {s.code}
                    </span>
                    <Art className="transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="t-h2">{s.name}</h3>
                    <p className="mt-1 text-muted">{s.tagline}</p>
                    <p className="t-overline mt-5 text-muted">{t.series.core}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {core.map((c) => (
                        <span
                          key={c.subjectCode}
                          className="rounded-full bg-sunken px-3 py-1 text-sm font-semibold"
                        >
                          {c.subjectName}
                        </span>
                      ))}
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 pt-6 font-semibold text-vert">
                      {t.series.more}{" "}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ---------- Chiffres clés ---------- */}
      <section className="py-4">
        <Container>
          <div className="rounded-4xl bg-vert px-6 py-12 text-on-vert sm:px-12">
            <h2 className="t-h2 text-center">{t.figures.title}</h2>
            <dl className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
              {t.figures.items.map((f, i) => (
                <div key={f.label} className="flex flex-col items-center text-center">
                  <dt className="order-2 mt-2 font-semibold opacity-90">{f.label}</dt>
                  <dd
                    className={`order-1 grid size-32 place-items-center rounded-full text-4xl font-extrabold tracking-tight ${
                      i === 3 ? "bg-mena text-white" : "bg-on-vert/15"
                    }`}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* ---------- Assistant ---------- */}
      <section className="py-20">
        <Container className="grid items-center gap-10 md:grid-cols-2">
          <div className="mx-auto w-full max-w-md">
            <AssistantArt />
          </div>
          <div>
            <p className="t-overline text-mena">{t.assistant.overline}</p>
            <h2 className="t-h1 mt-2 text-balance">{t.assistant.title}</h2>
            <p className="t-body-lg mt-3 text-muted">{t.assistant.lead}</p>
            <ul className="mt-6 space-y-3">
              {t.assistant.examples.map((q) => (
                <li key={q}>
                  <AskButton
                    question={q}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 text-left font-semibold shadow-sm transition-colors hover:border-vert"
                  >
                    <MessageCircleQuestion className="size-5 shrink-0 text-vert" />
                    <span className="flex-1">{q}</span>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-vert" />
                  </AskButton>
                </li>
              ))}
            </ul>
            <AskButton className={`${buttonClass.primary} mt-6`}>{t.assistant.cta}</AskButton>
          </div>
        </Container>
      </section>

      {/* ---------- Actualités ---------- */}
      <section className="bg-raised py-20">
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
          <div className="grid gap-6 md:grid-cols-3">
            {news.map((n) => (
              <NewsCard key={n.slug} news={n} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
