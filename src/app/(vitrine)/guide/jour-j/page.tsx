import type { Metadata } from "next";
import { Ban, Calculator, Clock, Droplet, FileText, IdCard, PenLine, Ruler } from "lucide-react";
import { GuideNav } from "@/components/GuideNav";
import { TipGrid } from "@/components/TipGrid";
import { Breadcrumb, Container, FrenchOnlyNote, PageHero, SourceLink } from "@/components/ui";
import { getBacData } from "@/lib/data";
import { COMMON } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Le jour J du Bacc",
  description:
    "Ce qu'il faut emporter le jour du Bacc et les règles à connaître : horaires, absence, fraude.",
};

const BAG = [
  { icon: FileText, label: { fr: "Convocation", mg: "Taratasy fiantsoana" }, must: true },
  { icon: IdCard, label: { fr: "Pièce d'identité", mg: "Kara-panondro" }, must: true },
  { icon: PenLine, label: { fr: "Stylos bleu et noir", mg: "Penina manga sy mainty" }, must: true },
  { icon: Ruler, label: { fr: "Règle, crayon, gomme", mg: "Lastikely, pensilihazo, fanafana" }, must: false },
  { icon: Clock, label: { fr: "Montre", mg: "Famantaranandro" }, must: false },
  { icon: Droplet, label: { fr: "Eau", mg: "Rano" }, must: false },
  {
    icon: Calculator,
    label: { fr: "Calculatrice, si autorisée", mg: "Milina fikajiana, raha avela" },
    must: false,
  },
];

const T = {
  fr: {
    overline: "Guide · 6",
    title: "Le jour J, sans stress",
    accent: "sans stress",
    lead: "Les épreuves commencent dès 7 h. Prépare ton sac la veille.",
    crumb: "Le jour J",
    bag: "Dans ton sac",
    must: "Obligatoire",
    reflexes: "Les bons réflexes",
    zeroTitle: "Absence = 0, et 0 = éliminé",
    zeroText:
      "Chaque épreuve est notée sur 20. Une absence vaut 0/20, et un 0 est éliminatoire sauf décision du jury. La fraude est lourdement sanctionnée.",
  },
  mg: {
    overline: "Torolalana · 6",
    title: "Ny andro J, tsy misy ahiahy",
    accent: "tsy misy ahiahy",
    lead: "Manomboka amin'ny 7 ora maraina ny fanadinana. Omano ny kitaponao ny hariva mialoha.",
    crumb: "Ny andro J",
    bag: "Ao anaty kitaponao",
    must: "Tsy maintsy",
    reflexes: "Ireo fahazarana tsara",
    zeroTitle: "Tsy tonga = 0, ary 0 = voaroaka",
    zeroText:
      "Isaina amin'ny 20 ny fanadinana tsirairay. Mitovy amin'ny 0/20 ny tsy fahatongavana, ary manala ny 0 afa-tsy raha manapa-kevitra hafa ny mpitsara. Voasazy mafy ny hosoka.",
  },
};

export default async function JourJPage() {
  const [data, lang] = await Promise.all([getBacData(), getLang()]);
  const t = T[lang];
  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="jourj" />
      <Container className="pt-8">
        <Breadcrumb lang={lang} items={[{ href: "/guide", label: COMMON[lang].guide }, { label: t.crumb }]} />

        <h2 className="t-h1">{t.bag}</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {BAG.map((b) => (
            <li
              key={b.label.fr}
              className="flex flex-col items-center rounded-3xl border border-line bg-raised p-4 text-center shadow-sm"
            >
              <span
                className={`grid size-16 place-items-center rounded-full ${b.must ? "bg-vert text-on-vert" : "bg-sunken text-ink"}`}
              >
                <b.icon className="size-8" aria-hidden />
              </span>
              <span className="mt-3 font-semibold">{b.label[lang]}</span>
              {b.must && <span className="mt-1 text-xs font-bold text-vert">{t.must}</span>}
            </li>
          ))}
        </ul>

        <h2 className="t-h1 mt-16">{t.reflexes}</h2>
        <FrenchOnlyNote lang={lang} />
        <div className="mt-6">
          <TipGrid tips={data.tips.filter((t) => t.category === "jour_j")} />
        </div>

        <div className="mt-10 flex items-start gap-4 rounded-4xl bg-danger-soft p-6">
          <Ban className="mt-1 size-8 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="t-h2 text-danger">{t.zeroTitle}</p>
            <p className="mt-2">{t.zeroText}</p>
            <div className="mt-2">
              <SourceLink lang={lang} source={data.sources.decret2021} />
            </div>
          </div>
        </div>
      </Container>
      <GuideNav current="jour-j" lang={lang} />
    </>
  );
}
