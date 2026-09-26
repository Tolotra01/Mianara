import type { Metadata } from "next";
import { CalendarHeart, MessageCircleQuestion } from "lucide-react";
import { AskButton } from "@/components/assistant/AskButton";
import { GuideNav } from "@/components/GuideNav";
import { PreparerArt } from "@/components/illustrations/Spots";
import { TipGrid } from "@/components/TipGrid";
import { Breadcrumb, buttonClass, Container, PageHero } from "@/components/ui";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Bien se préparer au Bac",
  description: "Une méthode simple pour réviser le Bac : priorités, annales, planning de la semaine.",
};

/** Semaine type : les matières à coefficient 5 d'abord, un sujet blanc, un jour léger. */
const WEEK = [
  { day: "Lun", what: "Matière coef. 5 n°1", kind: "core" },
  { day: "Mar", what: "Langues", kind: "other" },
  { day: "Mer", what: "Matière coef. 5 n°2", kind: "core" },
  { day: "Jeu", what: "Histoire-géo", kind: "other" },
  { day: "Ven", what: "Matière coef. 5 n°3", kind: "core" },
  { day: "Sam", what: "Sujet blanc chronométré", kind: "exam" },
  { day: "Dim", what: "Repos, révision légère", kind: "rest" },
] as const;

const KIND_CLASS = {
  core: "bg-vert text-on-vert",
  other: "bg-soleil text-ink",
  exam: "bg-mena text-white",
  rest: "bg-sunken text-muted",
};

export default async function PreparerPage() {
  const data = await getBacData();
  return (
    <>
      <PageHero
        overline="Guide · 5"
        title="Réviser malin, pas épuisé"
        lead="Pas de cours ici : une méthode, et un assistant pour t'aider à l'appliquer."
        art={<PreparerArt />}
      />
      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Bien se préparer" }]} />
        <TipGrid tips={data.tips.filter((t) => t.category === "preparer")} />

        <h2 className="t-h1 mt-16">Une semaine type</h2>
        <p className="mt-2 text-muted">À adapter à ta série et à ton emploi du temps.</p>
        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {WEEK.map((d) => (
            <li
              key={d.day}
              className={`flex min-h-36 flex-col justify-between rounded-3xl p-4 ${KIND_CLASS[d.kind]}`}
            >
              <span className="text-2xl font-extrabold">{d.day}</span>
              <span className="font-semibold">{d.what}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-4xl bg-vert-soft p-8 md:flex-row md:items-center">
          <CalendarHeart className="size-12 shrink-0 text-vert" aria-hidden />
          <div className="flex-1">
            <p className="t-h2">Un planning rien que pour toi ?</p>
            <p className="mt-1 text-muted">
              Dis à l&apos;assistant ta série et le temps qu&apos;il te reste.
            </p>
          </div>
          <AskButton
            question="Aide-moi à faire un planning de révision pour la série S, il me reste 3 mois."
            className={buttonClass.primary}
          >
            <MessageCircleQuestion className="size-5" /> Demander un planning
          </AskButton>
        </div>
      </Container>
      <GuideNav current="preparer" />
    </>
  );
}
