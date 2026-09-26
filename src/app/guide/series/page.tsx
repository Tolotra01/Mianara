import type { Metadata } from "next";
import { ArrowRight, Briefcase, Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CoefBars } from "@/components/CoefBars";
import { GuideNav } from "@/components/GuideNav";
import { SERIE_ART, SerieLArt } from "@/components/illustrations/Spots";
import { Breadcrumb, Container, PageHero, SourceLink } from "@/components/ui";
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
        <div className="mt-6 flex flex-wrap gap-2">
          {data.series.map((s) => (
            <a
              key={s.code}
              href={`#${s.code}`}
              className="rounded-full border border-line-strong bg-raised px-4 py-2 font-bold hover:border-vert hover:text-vert"
            >
              Série {s.code}
            </a>
          ))}
        </div>
      </PageHero>

      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Les séries" }]} />
        <div className="flex items-start gap-3 rounded-2xl bg-info-soft p-4 text-info">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Les séries A, C et D disparaissent au Bacc 2027.</p>
            <p className="mt-1 text-ink">
              L remplace A1 et A2, S remplace C et D. Des mesures de transition protègent les élèves de
              l&apos;ancien système.
            </p>
            <div className="mt-2">
              <SourceLink source={data.sources.suppressionACD} />
            </div>
          </div>
        </div>
      </Container>

      <Container className="mt-10 space-y-10">
        {data.series.map((s) => {
          const Art = SERIE_ART[s.code];
          const coefs = data.coefficients.filter((c) => c.serieCode === s.code);
          return (
            <section
              key={s.code}
              id={s.code}
              className="scroll-mt-24 overflow-hidden rounded-4xl border border-line bg-raised shadow-sm"
            >
              <div className="grid lg:grid-cols-[2fr_3fr]">
                <div className={`flex flex-col p-8 ${TINT[s.code]}`}>
                  <span className="grid size-16 place-items-center rounded-2xl bg-raised text-2xl font-extrabold text-vert shadow-sm">
                    {s.code}
                  </span>
                  <h2 className="t-h1 mt-4">{s.name}</h2>
                  <p className="t-body-lg mt-1 text-muted">{s.tagline}</p>
                  <p className="mt-3 inline-flex w-fit rounded-full bg-raised/70 px-3 py-1 text-sm font-semibold">
                    {s.formerOptions}
                  </p>
                  <div className="mx-auto mt-auto w-full max-w-xs pt-6">
                    <Art />
                  </div>
                </div>

                <div className="grid gap-8 p-8 md:grid-cols-2">
                  <div>
                    <h3 className="t-overline text-muted">Pour toi si…</h3>
                    <ul className="mt-3 space-y-2.5">
                      {s.forWhom.map((f) => (
                        <li key={f} className="flex items-center gap-3 font-semibold">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-vert text-on-vert">
                            <Check className="size-4" aria-hidden />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <h3 className="t-overline mt-8 text-muted">Et après ?</h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {s.careers.map((c) => (
                        <li
                          key={c}
                          className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold"
                        >
                          <Briefcase className="size-4 text-mena" aria-hidden />
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
                      className="mt-6 inline-flex items-center gap-1.5 font-semibold text-vert hover:underline"
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
      </Container>

      <GuideNav current="series" />
    </>
  );
}
