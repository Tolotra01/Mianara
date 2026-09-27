import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { MapPin, School, UserRound } from "lucide-react";
import Link from "next/link";
import { Ring } from "@/components/app/charts";
import { Alert, Card, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { candidates, schools } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { and } from "drizzle-orm";

export const metadata: Metadata = { title: "Écoles" };

export default async function EcolesOfficePage() {
  const user = await requireOffice();
  const db = requireDb();
  const [list, [libres]] = await Promise.all([
    db
      .select({
        s: schools,
        candidates: sql<number>`(select count(*)::int from candidates c where c.school_id = "schools"."id")`,
        pending: sql<number>`(select count(*)::int from applications a where a.school_id = "schools"."id" and a.status = 'submitted')`,
        incomplete: sql<number>`(select count(*)::int from applications a where a.school_id = "schools"."id" and a.status = 'incomplete')`,
      })
      .from(schools)
      .where(eq(schools.officeId, user.officeId))
      .orderBy(asc(schools.name)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(candidates)
      .where(and(eq(candidates.officeId, user.officeId), eq(candidates.kind, "libre"))),
  ]);
  const withCandidates = list.filter((l) => l.candidates > 0 || l.pending > 0);
  const ecoleLabel = withCandidates.length > 1 ? "établissements" : "établissement";
  const totals = list.reduce(
    (acc, l) => ({
      candidats: acc.candidats + l.candidates,
      aTraiter: acc.aTraiter + l.pending,
      incomplets: acc.incomplets + l.incomplete,
    }),
    { candidats: 0, aTraiter: 0, incomplets: 0 },
  );
  const dossiers = totals.aTraiter + totals.incomplets;
  const completion = dossiers > 0 ? Math.round((totals.aTraiter / dossiers) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow={user.officeName ?? "Office du Bacc"}
        title="Écoles"
        description="Les établissements rattachés à votre Office et les candidats qu'ils présentent au Bacc."
      />

      <div className="stagger mb-6 grid gap-4 lg:grid-cols-3">
        <div style={{ "--i": 0 } as React.CSSProperties} className="lg:col-span-2">
          <div className="flex h-full flex-wrap items-center gap-6 rounded-2xl border border-line bg-raised p-5 shadow-sm">
            <Ring value={completion} label="dossiers" size={104} />
            <div className="min-w-0 flex-1">
              <p className="t-overline text-vert">Suivi des dossiers</p>
              <p className="t-h2 mt-1 text-balance">
                {dossiers === 0
                  ? "Aucun dossier en attente"
                  : `${totals.aTraiter} dossier${totals.aTraiter > 1 ? "s" : ""} à traiter`}
              </p>
              <p className="mt-1.5 text-sm text-muted">
                {dossiers === 0
                  ? "Les écoles de votre Office n'ont encore soumis aucune candidature."
                  : `${totals.incomplets} incomplet${totals.incomplets > 1 ? "s" : ""} à relancer · ${totals.candidats} candidat${totals.candidats > 1 ? "s" : ""} enregistré${totals.candidats > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
        <div style={{ "--i": 1 } as React.CSSProperties}>
          <StatCard
            label={`${ecoleLabel} avec candidats`}
            value={withCandidates.length}
            icon={School}
            tone="brand"
            hint={
              list.length === 0
                ? "Aucune école rattachée"
                : `sur ${list.length} rattachée${list.length > 1 ? "s" : ""} à votre Office`
            }
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/office/candidats?type=libre"
          className="group flex items-center gap-4 rounded-2xl border border-line bg-raised p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-mena"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-mena-soft text-mena transition-transform duration-300 group-hover:scale-110">
            <UserRound className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="t-h3 block">Candidats libres</span>
            <span className="block text-sm text-muted">
              Sans établissement, enregistrés par l&apos;Office.
            </span>
          </span>
          <span className="text-3xl font-extrabold tabular-nums">{libres.n}</span>
        </Link>
        <Alert tone="info" title="Écoles créées par l'Administration">
          Pour ajouter un établissement, contactez l&apos;Administration nationale : chaque école reçoit ensuite un
          compte pour envoyer ses dossiers.
        </Alert>
      </div>
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={School}
            title="Aucune école rattachée"
            description="L'Administration crée les écoles et leurs comptes."
          />
        </Card>
      ) : (
        <>
          <h2 className="t-overline mb-3 mt-8 text-muted">
            Établissements rattachés · {list.length}
          </h2>
          <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map(({ s, candidates: n, pending, incomplete }, i) => (
              <div
                key={s.id}
                style={{ "--i": i } as React.CSSProperties}
                className="group rounded-2xl border border-line bg-raised p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-vert hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-bold leading-snug transition-colors group-hover:text-vert">
                      {s.name}
                    </p>
                  </div>
                  {!s.isActive && <StatusBadge tone="neutral">Inactive</StatusBadge>}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {s.commune}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{s.kind === "prive" ? "Privé" : "Public"}</span>
                  <span aria-hidden>·</span>
                  <span className="font-mono">{s.code}</span>
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Link
                    href={`/office/candidats?ecole=${s.id}`}
                    className="rounded-xl bg-sunken p-2 transition-colors hover:bg-vert-soft"
                  >
                    <dd className="text-xl font-extrabold tabular-nums">{n}</dd>
                    <dt className="text-xs text-muted">candidats</dt>
                  </Link>
                  <Link
                    href={`/office/dossiers?statut=submitted&ecole=${s.id}`}
                    className={`rounded-xl p-2 transition-colors hover:bg-vert-soft ${pending ? "bg-info-soft" : "bg-sunken"}`}
                  >
                    <dd className="text-xl font-extrabold tabular-nums">{pending}</dd>
                    <dt className="text-xs text-muted">à traiter</dt>
                  </Link>
                  <Link
                    href={`/office/dossiers?statut=incomplete&ecole=${s.id}`}
                    className={`rounded-xl p-2 transition-colors hover:bg-vert-soft ${incomplete ? "bg-soleil-soft" : "bg-sunken"}`}
                  >
                    <dd className="text-xl font-extrabold tabular-nums">{incomplete}</dd>
                    <dt className="text-xs text-muted">incomplets</dt>
                  </Link>
                </dl>
                {(s.contactName || s.phone) && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                    {s.contactName && <span className="truncate">{s.contactName}</span>}
                    {s.contactName && s.phone && <span aria-hidden>·</span>}
                    {s.phone && <span className="font-mono">{s.phone}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
