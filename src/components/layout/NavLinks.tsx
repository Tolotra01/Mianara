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
              ? `block rounded-md px-4 py-3 text-lg font-semibold ${active ? "bg-vert-soft text-vert" : "text-ink"}`
              : `relative rounded-full px-4 py-2 font-semibold transition-colors ${
                  active ? "bg-vert-soft text-vert" : "text-ink hover:bg-sunken"
                }`
          }
        >
          {item.label}
        </Link>
      );
    });

  return (
    <>
      <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
        {links(false)}
      </nav>
      <button
        type="button"
        className="grid size-12 place-items-center rounded-full hover:bg-sunken md:hidden"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      {open && (
        <nav
          aria-label="Principal"
          className="absolute inset-x-0 top-full border-b border-line bg-raised p-3 shadow-md md:hidden"
        >
          {links(true)}
        </nav>
      )}
    </>
  );
}
