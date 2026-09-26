import type { Metadata } from "next";
import { GuideNav } from "@/components/GuideNav";
import { CoefficientsArt } from "@/components/illustrations/Spots";
import { MoyenneSimulator } from "@/components/MoyenneSimulator";
import { Breadcrumb, Container, PageHero, SourceLink } from "@/components/ui";
import { RULES, type SerieCode } from "@/content/bac";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Coefficients et simulateur de moyenne",
  description:
    "Les coefficients de terminale des séries L, S et OSE (total 30) et un simulateur pour calculer ta moyenne au Bacc.",
};

const KEY_RULES = [
  { value: "30", label: "coefficients au total, dans chaque série" },
  { value: "5", label: "pour les trois matières de base" },
  { value: "10/20", label: "de moyenne pour être admis" },
  { value: "9,50", label: "seuil minimum si le jury délibère" },
];

export default async function CoefficientsPage({ searchParams }: PageProps<"/guide/coefficients">) {
  const [data, params] = await Promise.all([getBacData(), searchParams]);
  const asked = typeof params.serie === "string" ? params.serie.toUpperCase() : "";
  const initialSerie = (data.series.some((s) => s.code === asked) ? asked : "S") as SerieCode;

  return (
    <>
      <PageHero
        overline="Guide · 2"
        title="Le poids de chaque matière"
        lead="Ta moyenne = somme des (note × coefficient), divisée par la somme des coefficients."
        art={<CoefficientsArt />}
      />
      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Coefficients" }]} />
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {KEY_RULES.map((r) => (
            <div key={r.label} className="rounded-2xl border border-line bg-raised p-5 text-center shadow-sm">
              <dd className="text-3xl font-extrabold text-vert">{r.value}</dd>
              <dt className="mt-1 text-sm font-semibold text-muted">{r.label}</dt>
            </div>
          ))}
        </dl>

        <h2 className="t-h1 mt-14 mb-6">Simule ta moyenne</h2>
        <MoyenneSimulator
          series={data.series.map((s) => ({ code: s.code, name: s.name }))}
          coefficients={data.coefficients}
          mentions={RULES.mentions}
          admission={RULES.admissionAverage}
          juryFloor={RULES.juryFloor}
          initialSerie={initialSerie}
        />
        <div className="mt-4 flex flex-col gap-1">
          <SourceLink source={data.sources.coefficients2027} />
          <SourceLink source={data.sources.decret2021} />
        </div>
      </Container>
      <GuideNav current="coefficients" />
    </>
  );
}
