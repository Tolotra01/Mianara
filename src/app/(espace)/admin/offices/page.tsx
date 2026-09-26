import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { Building, Eye, MapPin, Power } from "lucide-react";
import { startOfficeVisit } from "@/app/actions/visit";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { buttonClass, Card, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { offices, users } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import { toggleOffice } from "../actions";
import { AgentDialog, OfficeDialog } from "./OfficeDialogs";

export const metadata: Metadata = { title: "Offices du Bac" };

export default async function OfficesPage() {
  await requireUser(["admin"]);
  const db = requireDb();
  const [list, agents] = await Promise.all([
    db
      .select({
        o: offices,
        candidates: sql<number>`(select count(*)::int from candidates where candidates.office_id = "offices"."id")`,
        supervisors: sql<number>`(select count(*)::int from users where users.office_id = "offices"."id" and users.role = 'supervisor')`,
      })
      .from(offices)
      .orderBy(asc(offices.id)),
    db.select().from(users).where(eq(users.role, "office")).orderBy(asc(users.fullName)),
  ]);

  return (
    <>
      <PageHeader
        title="Offices du Bac"
        description="Un Office par université. Visitez l'espace d'un Office pour voir ce que voient ses agents, en consultation."
        actions={<OfficeDialog />}
      />
      <div className="stagger grid gap-4 lg:grid-cols-2">
        {list.map(({ o, candidates, supervisors }, i) => {
          const team = agents.filter((a) => a.officeId === o.id);
          return (
            <div key={o.id} style={{ "--i": i } as React.CSSProperties}>
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <Building className="size-5 text-vert" /> {o.name}
                  </span>
                }
                description={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" /> {o.university}
                  </span>
                }
                actions={
                  <>
                    {o.isActive ? (
                      <StatusBadge tone="success">Actif</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Désactivé</StatusBadge>
                    )}
                    <OfficeDialog office={o} />
                  </>
                }
              >
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[
                    [candidates, "candidats"],
                    [team.length, "agents"],
                    [supervisors, "surveillants"],
                  ].map(([v, l]) => (
                    <div key={String(l)} className="rounded-xl bg-sunken p-3">
                      <dd className="text-2xl font-extrabold">{v}</dd>
                      <dt className="text-xs text-muted">{l}</dt>
                    </div>
                  ))}
                </dl>
                <ul className="mt-4 space-y-2">
                  {team.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-semibold">{a.fullName}</span> · <Mono>{a.username}</Mono>
                      </span>
                      {!a.isActive ? (
                        <StatusBadge tone="neutral">Fermé</StatusBadge>
                      ) : a.mustChangePassword ? (
                        <StatusBadge tone="warning">1re connexion</StatusBadge>
                      ) : null}
                    </li>
                  ))}
                  {team.length === 0 && <li className="text-sm text-muted">Aucun agent.</li>}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  <form action={startOfficeVisit}>
                    <input type="hidden" name="officeId" value={o.id} />
                    <button type="submit" className={buttonClass("primary", "sm")}>
                      <Eye className="size-4" /> Visiter l&apos;espace
                    </button>
                  </form>
                  <AgentDialog officeId={o.id} officeName={o.name} />
                  <ConfirmAction
                    action={toggleOffice}
                    fields={{ id: String(o.id) }}
                    variant="ghost"
                    size="sm"
                    icon={<Power className="size-4" />}
                    label={o.isActive ? "Désactiver" : "Réactiver"}
                    title={o.isActive ? `Désactiver ${o.name} ?` : `Réactiver ${o.name} ?`}
                    description={o.isActive ? "Les comptes de ses agents seront fermés." : undefined}
                  />
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}
