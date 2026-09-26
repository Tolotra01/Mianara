import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { MapPin, School, UserRound } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
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

  return (
    <>
      <PageHeader
        title="Écoles"
        description={`${withCandidates.length} établissement(s) présentent des candidats au Bacc dans votre Office. Les écoles sont créées par l'Administration.`}
      />
      <Link
        href="/office/candidats?type=libre"
        className="mb-6 flex items-center gap-4 rounded-2xl border border-line bg-raised p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-vert"
      >
        <span className="grid size-12 place-items-center rounded-xl bg-mena-soft text-mena">
          <UserRound className="size-6" />
        </span>
        <span className="flex-1">
          <span className="t-h3 block">Candidats libres</span>
          <span className="text-sm text-muted">
            Personnes qui se présentent sans établissement, enregistrées directement par l&apos;Office.
          </span>
        </span>
        <span className="text-3xl font-extrabold">{libres.n}</span>
      </Link>
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={School}
            title="Aucune école rattachée"
            description="L'Administration crée les écoles et leurs comptes."
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map(({ s, candidates: n, pending, incomplete }, i) => (
            <div
              key={s.id}
              style={{ "--i": i } as React.CSSProperties}
              className="rounded-2xl border border-line bg-raised p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted">
                    <MapPin className="size-3.5" /> {s.commune} · {s.kind === "prive" ? "Privé" : "Public"} ·{" "}
                    <span className="font-mono">{s.code}</span>
                  </p>
                </div>
                {!s.isActive && <StatusBadge tone="neutral">Inactive</StatusBadge>}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Link
                  href={`/office/candidats?ecole=${s.id}`}
                  className="rounded-xl bg-sunken p-2 hover:bg-vert-soft"
                >
                  <dd className="text-xl font-extrabold">{n}</dd>
                  <dt className="text-xs text-muted">candidats</dt>
                </Link>
                <Link
                  href={`/office/dossiers?statut=submitted&ecole=${s.id}`}
                  className={`rounded-xl p-2 ${pending ? "bg-info-soft" : "bg-sunken"} hover:bg-vert-soft`}
                >
                  <dd className="text-xl font-extrabold">{pending}</dd>
                  <dt className="text-xs text-muted">à traiter</dt>
                </Link>
                <Link
                  href={`/office/dossiers?statut=incomplete&ecole=${s.id}`}
                  className={`rounded-xl p-2 ${incomplete ? "bg-soleil-soft" : "bg-sunken"} hover:bg-vert-soft`}
                >
                  <dd className="text-xl font-extrabold">{incomplete}</dd>
                  <dt className="text-xs text-muted">incomplets</dt>
                </Link>
              </dl>
              {(s.contactName || s.phone) && (
                <p className="mt-3 text-sm text-muted">
                  {s.contactName} {s.phone && `· ${s.phone}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
