"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks({ items, menuLabel, login }: { items: Item[]; menuLabel: string; login: Item }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (mobile: boolean) =>
    (mobile ? [...items, login] : items).map((item) => {
      const active = isActive(pathname, item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={
            mobile
              ? `flex items-center justify-between rounded-2xl px-4 py-3 text-lg font-semibold transition-colors ${
                  active ? "bg-vert text-on-vert" : "text-ink hover:bg-sunken"
                }`
              : `rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  active ? "bg-vert text-on-vert shadow-sm" : "text-muted hover:bg-sunken hover:text-ink"
                }`
          }
        >
          {item.label}
        </Link>
      );
    });

  return (
    <>
      {/* Rail : les liens vivent dans une capsule, l'onglet actif s'y allume. */}
      <nav
        aria-label="Principal"
        className="hidden items-center gap-1 rounded-full border border-line/70 bg-raised/50 p-1 md:flex"
      >
        {links(false)}
      </nav>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full border border-line/70 bg-raised/50 transition-colors hover:border-vert/60 md:hidden"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <nav
          aria-label="Principal"
          className="absolute inset-x-4 top-[calc(100%+0.5rem)] rounded-3xl border border-line bg-raised p-2.5 shadow-xl md:hidden"
        >
          {links(true)}
        </nav>
      )}
    </>
  );
}
