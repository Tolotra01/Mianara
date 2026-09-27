"use client";

import { ArrowLeft, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { logout } from "@/app/actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/auth-shared";
import { Avatar } from "./ui";
import { type BadgeKey, NAV } from "./nav";

type Props = {
  role: Role;
  /** Office consulté par l'Admin (mode visite). */
  visit?: { officeName: string } | null;
  user: { fullName: string; username: string; subtitle: string | null };
  badges: Partial<Record<BadgeKey, number>>;
};

function isActive(pathname: string, href: string) {
  const roots = [
    "/office",
    "/candidat",
    "/admin",
    "/surveillant",
    "/ecole",
    "/enseignant",
    "/admin/apprentissage",
  ];
  return roots.includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavContent({ role, user, badges, visit, onNavigate }: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();
  // En visite, l'Admin voit la navigation de l'Office consulté.
  const visiting = role === "admin" && visit && pathname.startsWith("/office");
  const groups = visiting
    ? [
        { items: [{ href: "/admin/offices", label: "Retour à l'administration", icon: ArrowLeft }] },
        ...NAV.office,
      ]
    : NAV[role];
  const spaceLabel = visiting ? `Visite · ${ROLE_LABEL.office}` : ROLE_LABEL[role];
  const subtitle = visiting ? visit.officeName : user.subtitle;
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <Link href="/" aria-label="Mianara — site public" onClick={onNavigate}>
          <Logo className="h-8 w-auto" />
        </Link>
      </div>
      <div className="px-4 pt-4">
        <p className="rounded-xl bg-vert-soft px-3 py-2">
          <span className="t-overline block text-vert">{spaceLabel}</span>
          {subtitle && <span className="block truncate text-sm font-semibold">{subtitle}</span>}
        </p>
      </div>
      <nav aria-label="Espace" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => (
          <div key={gi} className={gi ? "mt-5" : undefined}>
            {group.label && <p className="t-overline mb-1.5 px-3 text-muted">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                        active ? "bg-vert text-on-vert shadow-sm" : "text-ink hover:bg-sunken"
                      }`}
                    >
                      <item.icon
                        className={`size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? "" : "text-muted group-hover:text-vert"}`}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge ? (
                        <span
                          className={`min-w-5 rounded-full px-1.5 text-center text-xs font-bold ${
                            active ? "bg-on-vert/20 text-on-vert" : "bg-soleil text-ink"
                          }`}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Avatar name={user.fullName} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate font-mono text-xs text-muted">{user.username}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
      <div className="lamba h-2" aria-hidden />
    </div>
  );
}

export function Sidebar(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-raised lg:block">
        <NavContent {...props} />
      </aside>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 grid size-10 place-items-center rounded-lg border border-line bg-raised shadow-sm lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="anim-fade absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="anim-drawer relative h-full w-72 bg-raised shadow-md">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-lg hover:bg-sunken"
              aria-label="Fermer le menu"
            >
              <X className="size-5" />
            </button>
            <NavContent {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
