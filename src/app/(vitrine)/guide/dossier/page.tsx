import type { Metadata } from "next";
import { Building2, Clock, Info } from "lucide-react";
import { DossierChecklist } from "@/components/DossierChecklist";
import { GuideNav } from "@/components/GuideNav";
import { Icon } from "@/components/Icon";
import { Breadcrumb, Container, FrenchOnlyNote, PageHero, SourceLink, ToConfirm } from "@/components/ui";
import { UNIVERSITIES } from "@/content/bac";
import { getBacData } from "@/lib/data";
import { COMMON } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Dossier d'inscription au Bacc",
  description:
    "Les pièces à préparer, les frais d'inscription et où déposer votre dossier du Bacc à Madagascar.",
};

const T = {
  fr: {
    overline: "Guide · 3",
    title: "Votre dossier, pièce par pièce",
    accent: "pièce par pièce",
    lead: "Cochez au fur et à mesure. Votre liste reste enregistrée sur cet appareil.",
    crumb: "Le dossier",
    deadlineTitle: "Aucune dérogation après la date limite.",
    deadline: (date: string) =>
      `En 2026 : clôture le ${date} à 18 h. Pour 2027, les inscriptions ouvrent en janvier.`,
    indicative: "Liste indicative.",
    indicativeText: "Les pièces marquées",
    indicativeEnd: "sont à vérifier auprès de votre lycée ou de l'Office du Bacc.",
    feesTitle: "Les frais d'inscription",
    feesLead: "Tarifs de la session 2026, inchangés par rapport à l'année précédente.",
    fees: {
      ecole: "Candidat d'école",
      libre: "Candidat libre",
      etranger: "Candidat étranger scolarisé à Madagascar",
    },
    whereTitle: "Où déposer ?",
    ecole: "Candidat d'école",
    ecoleText:
      "Votre lycée rassemble les dossiers et les transmet. Vérifiez auprès de lui que le vôtre est bien parti.",
    libre: "Candidat libre",
    libreText:
      "À l'Office du Bacc de l'université de votre province. Vous passez l'examen dans le secteur où vous habitez.",
  },
  mg: {
    overline: "Torolalana · 3",
    title: "Ny antontan-taratasinao, tsirairay avy",
    accent: "tsirairay avy",
    lead: "Asio marika rehefa vonona ny taratasy iray. Voatahiry ato amin'ity fitaovana ity ny lisitrao.",
    crumb: "Ny antontan-taratasy",
    deadlineTitle: "Tsy misy fanavahana intsony aorian'ny daty farany.",
    deadline: (date: string) =>
      `Tamin'ny 2026 : nikatona ny ${date} tamin'ny 6 ora hariva. Ho an'ny 2027, misokatra amin'ny Janoary ny fisoratana anarana.`,
    indicative: "Lisitra ho fanoroana.",
    indicativeText: "Ireo taratasy misy marika",
    indicativeEnd: "dia hamarinina any amin'ny lycée-nao na any amin'ny Office du Bacc.",
    feesTitle: "Ny saran'ny fisoratana anarana",
    feesLead: "Saran'ny taom-pianarana 2026, tsy niova raha oharina tamin'ny taona teo aloha.",
    fees: {
      ecole: "Kandida avy any an-tsekoly",
      libre: "Kandida tsy miankina",
      etranger: "Kandida vahiny mianatra eto Madagasikara",
    },
    whereTitle: "Aiza no hametrahana azy ?",
    ecole: "Kandida avy any an-tsekoly",
    ecoleText:
      "Ny lycée-nao no manangona ireo antontan-taratasy ary mandefa azy. Hamarino aminy fa lasa tokoa ny anao.",
    libre: "Kandida tsy miankina",
    libreText:
      "Any amin'ny Office du Bacc an'ny oniversiten'ny faritanao. Any amin'ny faritra onenanao no hanaovanao ny fanadinana.",
  },
};

export default async function DossierPage() {
  const [data, lang] = await Promise.all([getBacData(), getLang()]);
  const t = T[lang];
  const icons = Object.fromEntries(
    data.dossier.map((d) => [d.icon, <Icon key={d.icon} name={d.icon} className="size-6" />]),
  );
  const deadline = data.calendar.find((c) => c.kind === "inscription" && c.title.startsWith("Clôture"));

  return (
    <>
      <PageHero overline={t.overline} title={t.title} accent={t.accent} lead={t.lead} scene="dossier" />
      <Container className="pt-8">
        <Breadcrumb lang={lang} items={[{ href: "/guide", label: COMMON[lang].guide }, { label: t.crumb }]} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="font-bold text-danger">{t.deadlineTitle}</p>
              <p className="mt-1">{t.deadline(deadline?.dateLabel ?? "27 mars")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-warning-soft p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-bold text-warning">{t.indicative}</span> {t.indicativeText}{" "}
              <ToConfirm lang={lang} /> {t.indicativeEnd}
            </p>
          </div>
        </div>

        <FrenchOnlyNote lang={lang} />
        <div className="mt-8">
          <DossierChecklist
            items={data.dossier}
            icons={icons}
            confirmBadge={<ToConfirm lang={lang} />}
            lang={lang}
          />
        </div>

        <h2 className="t-h1 mt-16">{t.feesTitle}</h2>
        <p className="mt-2 text-muted">{t.feesLead}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.fees.map((f, i) => (
            <div key={f.candidateType} className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
              <p className="font-semibold text-muted">
                {t.fees[f.candidateType as keyof typeof t.fees] ?? f.label}
              </p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums">
                {f.amountAriary.toLocaleString("fr-FR")}
                <span className="ml-1 text-xl text-muted">Ar</span>
              </p>
              <div className={`mt-4 h-2 rounded-full ${["bg-vert", "bg-soleil", "bg-mena"][i % 3]}`} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <SourceLink lang={lang} source={data.sources.frais2026} />
        </div>

        <h2 className="t-h1 mt-16">{t.whereTitle}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <p className="t-h3">{t.ecole}</p>
            <p className="mt-2 text-muted">{t.ecoleText}</p>
          </div>
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <p className="t-h3">{t.libre}</p>
            <p className="mt-2 text-muted">{t.libreText}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {UNIVERSITIES.map((u) => (
                <li
                  key={u}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold"
                >
                  <Building2 className="size-4 text-vert" aria-hidden />
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3">
          <SourceLink lang={lang} source={data.sources.decret2021} />
        </div>
      </Container>
      <GuideNav current="dossier" lang={lang} />
    </>
  );
}
