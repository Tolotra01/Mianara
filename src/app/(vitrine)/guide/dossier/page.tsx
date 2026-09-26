import type { Metadata } from "next";
import { Building2, Clock, Info } from "lucide-react";
import { DossierChecklist } from "@/components/DossierChecklist";
import { GuideNav } from "@/components/GuideNav";
import { Icon } from "@/components/Icon";
import { Breadcrumb, Container, PageHero, SourceLink, ToConfirm } from "@/components/ui";
import { UNIVERSITIES } from "@/content/bac";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Dossier d'inscription au Bacc",
  description:
    "Les pièces à préparer, les frais d'inscription et où déposer votre dossier du Bacc à Madagascar.",
};

export default async function DossierPage() {
  const data = await getBacData();
  const icons = Object.fromEntries(
    data.dossier.map((d) => [d.icon, <Icon key={d.icon} name={d.icon} className="size-6" />]),
  );
  const deadline = data.calendar.find((c) => c.kind === "inscription" && c.title.startsWith("Clôture"));

  return (
    <>
      <PageHero
        overline="Guide · 3"
        title="Votre dossier, pièce par pièce"
        accent="pièce par pièce"
        lead="Cochez au fur et à mesure. Votre liste reste enregistrée sur cet appareil."
        scene="dossier"
      />
      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Le dossier" }]} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="font-bold text-danger">Aucune dérogation après la date limite.</p>
              <p className="mt-1">
                En 2026 : clôture le {deadline?.dateLabel ?? "27 mars"} à 18 h. Pour 2027, les inscriptions
                ouvrent en janvier.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-warning-soft p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-bold text-warning">Liste indicative.</span> Les pièces marquées{" "}
              <ToConfirm /> sont à vérifier auprès de votre lycée ou de l&apos;Office du Bacc.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <DossierChecklist items={data.dossier} icons={icons} confirmBadge={<ToConfirm />} />
        </div>

        <h2 className="t-h1 mt-16">Les frais d&apos;inscription</h2>
        <p className="mt-2 text-muted">
          Tarifs de la session 2026, inchangés par rapport à l&apos;année précédente.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.fees.map((f, i) => (
            <div key={f.candidateType} className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
              <p className="font-semibold text-muted">{f.label}</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums">
                {f.amountAriary.toLocaleString("fr-FR")}
                <span className="ml-1 text-xl text-muted">Ar</span>
              </p>
              <div className={`mt-4 h-2 rounded-full ${["bg-vert", "bg-soleil", "bg-mena"][i % 3]}`} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <SourceLink source={data.sources.frais2026} />
        </div>

        <h2 className="t-h1 mt-16">Où déposer ?</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <p className="t-h3">Candidat d&apos;école</p>
            <p className="mt-2 text-muted">
              Votre lycée rassemble les dossiers et les transmet. Vérifiez auprès de lui que le vôtre est bien
              parti.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <p className="t-h3">Candidat libre</p>
            <p className="mt-2 text-muted">
              À l&apos;Office du Bacc de l&apos;université de votre province. Vous passez l&apos;examen dans
              le secteur où vous habitez.
            </p>
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
          <SourceLink source={data.sources.decret2021} />
        </div>
      </Container>
      <GuideNav current="dossier" />
    </>
  );
}
