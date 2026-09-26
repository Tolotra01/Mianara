import type { Metadata } from "next";
import { Ban, Calculator, Clock, Droplet, FileText, IdCard, PenLine, Ruler } from "lucide-react";
import { GuideNav } from "@/components/GuideNav";
import { TipGrid } from "@/components/TipGrid";
import { Breadcrumb, Container, PageHero, SourceLink } from "@/components/ui";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Le jour J du Bacc",
  description:
    "Ce qu'il faut emporter le jour du Bacc et les règles à connaître : horaires, absence, fraude.",
};

const BAG = [
  { icon: FileText, label: "Convocation", must: true },
  { icon: IdCard, label: "Pièce d'identité", must: true },
  { icon: PenLine, label: "Stylos bleu et noir", must: true },
  { icon: Ruler, label: "Règle, crayon, gomme", must: false },
  { icon: Clock, label: "Montre", must: false },
  { icon: Droplet, label: "Eau", must: false },
  { icon: Calculator, label: "Calculatrice, si autorisée", must: false },
];

export default async function JourJPage() {
  const data = await getBacData();
  return (
    <>
      <PageHero
        overline="Guide · 6"
        title="Le jour J, sans stress"
        accent="sans stress"
        lead="Les épreuves commencent dès 7 h. Prépare ton sac la veille."
        scene="jourj"
      />
      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Le jour J" }]} />

        <h2 className="t-h1">Dans ton sac</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {BAG.map((b) => (
            <li
              key={b.label}
              className="flex flex-col items-center rounded-3xl border border-line bg-raised p-4 text-center shadow-sm"
            >
              <span
                className={`grid size-16 place-items-center rounded-full ${b.must ? "bg-vert text-on-vert" : "bg-sunken text-ink"}`}
              >
                <b.icon className="size-8" aria-hidden />
              </span>
              <span className="mt-3 font-semibold">{b.label}</span>
              {b.must && <span className="mt-1 text-xs font-bold text-vert">Obligatoire</span>}
            </li>
          ))}
        </ul>

        <h2 className="t-h1 mt-16">Les bons réflexes</h2>
        <div className="mt-6">
          <TipGrid tips={data.tips.filter((t) => t.category === "jour_j")} />
        </div>

        <div className="mt-10 flex items-start gap-4 rounded-4xl bg-danger-soft p-6">
          <Ban className="mt-1 size-8 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="t-h2 text-danger">Absence = 0, et 0 = éliminé</p>
            <p className="mt-2">
              Chaque épreuve est notée sur 20. Une absence vaut 0/20, et un 0 est éliminatoire sauf décision
              du jury. La fraude est lourdement sanctionnée.
            </p>
            <div className="mt-2">
              <SourceLink source={data.sources.decret2021} />
            </div>
          </div>
        </div>
      </Container>
      <GuideNav current="jour-j" />
    </>
  );
}
