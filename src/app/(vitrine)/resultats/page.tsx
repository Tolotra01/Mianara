import type { Metadata } from "next";
import { and, eq, sql } from "drizzle-orm";
import { Clock, PartyPopper, Search, SearchX } from "lucide-react";
import { ResultatsArt } from "@/components/illustrations/Spots";
import { Container, PageHero } from "@/components/ui";
import { db } from "@/db";
import { examSessions } from "@/db/schema";
import { candidates, results } from "@/db/schema-gestion";
import { DECISION_LABEL, formatDateTime, MENTION_LABEL } from "@/lib/bac-rules";

export const metadata: Metadata = {
  title: "Résultats du Bac",
  description:
    "Consultez votre résultat au Baccalauréat par matricule, ou par nom, prénom et date de naissance.",
};

export default async function ResultatsPublicPage({ searchParams }: PageProps<"/resultats">) {
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" ? String(params[k]).trim() : "");
  const matricule = get("matricule").toUpperCase();
  const nom = get("nom");
  const prenom = get("prenom");
  const naissance = get("naissance");
  const searched = Boolean(matricule || (nom && prenom && naissance));

  const [session] = db
    ? await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1)
    : [];
  const published = Boolean(session?.resultsPublishAt && session.resultsPublishAt <= new Date());

  let found: {
    name: string;
    matricule: string;
    serie: string;
    decision: keyof typeof DECISION_LABEL;
    mention: keyof typeof MENTION_LABEL | null;
  } | null = null;
  if (db && published && searched) {
    const where = matricule
      ? eq(candidates.matricule, matricule)
      : and(
          sql`lower(${candidates.lastName}) = lower(${nom})`,
          sql`lower(${candidates.firstName}) = lower(${prenom})`,
          eq(candidates.birthDate, naissance),
        );
    const [row] = await db
      .select({ c: candidates, r: results })
      .from(candidates)
      .innerJoin(results, eq(results.candidateId, candidates.id))
      .where(and(where, eq(candidates.sessionId, session.id)))
      .limit(1);
    if (row)
      found = {
        name: `${row.c.firstName} ${row.c.lastName}`,
        matricule: row.c.matricule,
        serie: row.c.serieCode,
        decision: row.r.decision,
        mention: row.r.mention,
      };
  }

  return (
    <>
      <PageHero
        overline={`Bac ${session?.year ?? ""}`}
        title="Résultats du Bac"
        lead="Recherchez par matricule, ou par nom, prénom et date de naissance."
        art={<ResultatsArt />}
      />
      <Container className="py-12">
        {!published ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-line bg-raised p-10 text-center shadow-sm">
            <Clock className="size-12 text-warning" />
            <h2 className="t-h2 mt-4">Résultats pas encore publiés</h2>
            <p className="mt-2 text-muted">
              {session?.resultsPublishAt
                ? `Publication le ${formatDateTime(session.resultsPublishAt)}.`
                : "La date de publication sera annoncée dans les actualités."}
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2 xl:max-w-5xl">
            <form className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
              <h2 className="t-h3">Par matricule</h2>
              <label htmlFor="matricule" className="sr-only">
                Matricule
              </label>
              <input
                id="matricule"
                name="matricule"
                defaultValue={matricule}
                placeholder="BAC2027-S-00001"
                className="field-input mt-3 h-12 font-mono font-semibold tracking-wide uppercase"
              />
              <button
                type="submit"
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-vert font-semibold text-on-vert hover:bg-vert-hover"
              >
                <Search className="size-5" /> Rechercher
              </button>
            </form>
            <form className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
              <h2 className="t-h3">Par identité</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  name="nom"
                  aria-label="Nom"
                  defaultValue={nom}
                  placeholder="Nom"
                  required
                  className="field-input"
                />
                <input
                  name="prenom"
                  aria-label="Prénoms"
                  defaultValue={prenom}
                  placeholder="Prénoms"
                  required
                  className="field-input"
                />
              </div>
              <label className="mt-3 block text-sm font-semibold">
                Date de naissance
                <input
                  name="naissance"
                  type="date"
                  defaultValue={naissance}
                  required
                  className="field-input mt-1.5"
                />
              </label>
              <button
                type="submit"
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-line-strong font-semibold hover:border-vert hover:text-vert"
              >
                <Search className="size-5" /> Rechercher
              </button>
            </form>

            {searched && (
              <div className="lg:col-span-2">
                {found ? (
                  <div
                    className={`a-pop rounded-3xl p-8 text-center shadow-md ${found.decision === "admitted" ? "bg-vert text-on-vert" : "border border-line bg-raised"}`}
                  >
                    {found.decision === "admitted" && <PartyPopper className="mx-auto size-10 text-soleil" />}
                    <p className="mt-2 font-semibold opacity-90">
                      {found.name} · <span className="font-mono">{found.matricule}</span> · série{" "}
                      {found.serie}
                    </p>
                    <p className="t-display mt-2">
                      {DECISION_LABEL[found.decision]}
                      {found.mention ? ` · ${MENTION_LABEL[found.mention]}` : ""}
                    </p>
                    <p className="mt-2 text-sm opacity-80">
                      Le détail des notes est dans votre espace Mianara.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 rounded-3xl border border-line bg-raised p-8 text-muted">
                    <SearchX className="size-6" /> Aucun résultat : vérifiez l&apos;orthographe ou le
                    matricule.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
