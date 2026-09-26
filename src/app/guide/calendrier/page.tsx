import type { Metadata } from "next";
import { Fragment } from "react";
import { ClipboardPen, GraduationCap, type LucideIcon, MapPin, PencilLine, Sparkles } from "lucide-react";
import { GuideNav } from "@/components/GuideNav";
import { CalendrierArt } from "@/components/illustrations/Spots";
import { Breadcrumb, Container, PageHero, ToConfirm } from "@/components/ui";
import { getBacData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Calendrier du Bac",
  description:
    "Inscriptions, épreuves et résultats : les dates clés du Bac à Madagascar, session 2026 et Bac 2027.",
};

const KIND: Record<string, { icon: LucideIcon; label: string; className: string }> = {
  inscription: { icon: ClipboardPen, label: "Inscription", className: "bg-soleil text-ink" },
  examen: { icon: PencilLine, label: "Épreuves", className: "bg-mena text-white" },
  resultats: { icon: GraduationCap, label: "Résultats", className: "bg-vert text-on-vert" },
  reforme: { icon: Sparkles, label: "Réforme", className: "bg-info text-white" },
};

export default async function CalendrierPage() {
  const data = await getBacData();
  const today = new Date().toISOString().slice(0, 10);
  const events = [...data.calendar].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const firstUpcoming = events.findIndex((e) => (e.endsOn ?? e.startsOn) >= today);

  return (
    <>
      <PageHero
        overline="Guide · 4"
        title="Les dates à ne pas manquer"
        lead="La session 2026 sert de repère : les dates du Bac 2027 seront ajoutées dès leur publication."
        art={<CalendrierArt />}
      />
      <Container className="pt-8">
        <Breadcrumb items={[{ href: "/guide", label: "Guide" }, { label: "Le calendrier" }]} />

        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(KIND).map(([key, k]) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 rounded-full bg-raised px-3 py-1.5 text-sm font-semibold shadow-sm"
            >
              <span className={`grid size-6 place-items-center rounded-full ${k.className}`}>
                <k.icon className="size-3.5" aria-hidden />
              </span>
              {k.label}
            </span>
          ))}
        </div>

        <ol className="relative mt-10 ml-6 border-l-4 border-dashed border-line-strong/40 pb-2">
          {events.map((e, i) => {
            const k = KIND[e.kind];
            const past = i < firstUpcoming || firstUpcoming === -1;
            const source = e.sourceKey ? data.sources[e.sourceKey] : null;
            return (
              <Fragment key={`${e.startsOn}-${e.title}`}>
                {i === firstUpcoming && (
                  <li className="relative pb-8" aria-label="Aujourd'hui">
                    <div className="-ml-[1.6rem] flex items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-full bg-ink text-surface ring-4 ring-surface">
                        <MapPin className="size-5" aria-hidden />
                      </span>
                      <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-surface">
                        Aujourd&apos;hui
                      </span>
                    </div>
                  </li>
                )}
                <li className="relative pb-8 pl-10">
                  <span
                    className={`absolute top-1 -left-[1.6rem] grid size-12 place-items-center rounded-full ring-4 ring-surface ${k.className} ${
                      past ? "opacity-60" : ""
                    }`}
                  >
                    <k.icon className="size-5" aria-hidden />
                  </span>
                  <div
                    className={`rounded-3xl border border-line bg-raised p-5 shadow-sm ${past ? "opacity-75" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="t-overline rounded-full bg-sunken px-2.5 py-1 text-muted">
                        Bac {e.sessionYear}
                      </span>
                      {past && <span className="text-sm font-semibold text-muted">Passé</span>}
                      {!e.confirmed && <ToConfirm label="Date à publier" />}
                    </div>
                    <p className="t-h2 mt-2 tabular-nums">{e.dateLabel}</p>
                    <p className="mt-1 t-body-lg">{e.title}</p>
                    {source && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-muted underline hover:text-vert"
                      >
                        Source : {source.label}
                      </a>
                    )}
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </Container>
      <GuideNav current="calendrier" />
    </>
  );
}
