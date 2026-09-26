import type { Metadata } from "next";
import { CalendarHeart, MessageCircleQuestion } from "lucide-react";
import { AskButton } from "@/components/assistant/AskButton";
import { GuideNav } from "@/components/GuideNav";
import { TipGrid } from "@/components/TipGrid";
import { Breadcrumb, buttonClass, Container, FrenchOnlyNote, PageHero } from "@/components/ui";
import { getBacData } from "@/lib/data";
import { COMMON } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Bien se préparer au Bacc",
  description: "Une méthode simple pour réviser le Bacc : priorités, annales, planning de la semaine.",
};

/** Semaine type : les matières à coefficient 5 d'abord, un sujet blanc, un jour léger. */
const T = {
  fr: {
    overline: "Guide · 5",
    title: "Réviser malin, pas épuisé",
    accent: "Réviser malin,",
    lead: "Pas de cours ici : une méthode, et un assistant pour t'aider à l'appliquer.",
    crumb: "Bien se préparer",
    weekTitle: "Une semaine type",
    weekLead: "À adapter à ta série et à ton emploi du temps.",
    week: [
      { day: "Lun", what: "Matière coef. 5 n°1", kind: "core" },
      { day: "Mar", what: "Langues", kind: "other" },
      { day: "Mer", what: "Matière coef. 5 n°2", kind: "core" },
      { day: "Jeu", what: "Histoire-géo", kind: "other" },
      { day: "Ven", what: "Matière coef. 5 n°3", kind: "core" },
      { day: "Sam", what: "Sujet blanc chronométré", kind: "exam" },
      { day: "Dim", what: "Repos, révision légère", kind: "rest" },
    ],
    planTitle: "Un planning rien que pour toi ?",
    planLead: "Dis à l'assistant ta série et le temps qu'il te reste.",
    planQuestion: "Aide-moi à faire un planning de révision pour la série S, il me reste 3 mois.",
    planCta: "Demander un planning",
  },
  mg: {
    overline: "Torolalana · 5",
    title: "Mamerina amim-pahendrena, tsy ho reraka",
    accent: "Mamerina amim-pahendrena,",
    lead: "Tsy misy lesona eto : fomba fiasa iray, sy mpanampy hanampy anao hampihatra azy.",
    crumb: "Miomana tsara",
    weekTitle: "Herinandro ohatra",
    weekLead: "Ampifanaraho amin'ny andianao sy ny fandaharam-potoananao.",
    week: [
      { day: "Alats", what: "Taranja coef. 5 voalohany", kind: "core" },
      { day: "Tal", what: "Fiteny", kind: "other" },
      { day: "Alar", what: "Taranja coef. 5 faharoa", kind: "core" },
      { day: "Alak", what: "Tantara sy jeografia", kind: "other" },
      { day: "Zom", what: "Taranja coef. 5 fahatelo", kind: "core" },
      { day: "Sab", what: "Fanadinana andrana voafetra fotoana", kind: "exam" },
      { day: "Alah", what: "Fialan-tsasatra, famerenana maivana", kind: "rest" },
    ],
    planTitle: "Fandaharana ho anao manokana ?",
    planLead: "Lazao amin'ny mpanampy ny andianao sy ny fotoana sisa tavela aminao.",
    planQuestion: "Ampio aho hanao fandaharana famerenana ho an'ny andiany S, 3 volana sisa no tavela.",
    planCta: "Hangataka fandaharana",
  },
} as const;

const KIND_CLASS = {
  core: "bg-vert text-on-vert",
  other: "bg-soleil text-ink",
  exam: "bg-mena text-white",
  rest: "bg-sunken text-muted",
};

export default async function PreparerPage() {
  const [data, lang] = await Promise.all([getBacData(), getLang()]);
  const t = T[lang];
  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="preparer" />
      <Container className="pt-8">
        <Breadcrumb lang={lang} items={[{ href: "/guide", label: COMMON[lang].guide }, { label: t.crumb }]} />
        <FrenchOnlyNote lang={lang} className="mb-6" />
        <TipGrid tips={data.tips.filter((t) => t.category === "preparer")} />

        <h2 className="t-h1 mt-16">{t.weekTitle}</h2>
        <p className="mt-2 text-muted">{t.weekLead}</p>
        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {t.week.map((d) => (
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
            <p className="t-h2">{t.planTitle}</p>
            <p className="mt-1 text-muted">{t.planLead}</p>
          </div>
          <AskButton question={t.planQuestion} className={buttonClass.primary}>
            <MessageCircleQuestion className="size-5" /> {t.planCta}
          </AskButton>
        </div>
      </Container>
      <GuideNav current="preparer" lang={lang} />
    </>
  );
}
