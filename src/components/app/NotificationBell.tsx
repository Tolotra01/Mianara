"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { markAllNotificationsRead } from "@/app/actions/notifications";

type Item = {
  id: number;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

export function NotificationBell({
  items,
  unread,
  allHref,
}: {
  items: Item[];
  unread: number;
  allHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="anim-count absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-mena px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="anim-scale absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-raised shadow-md">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => markAllNotificationsRead())}
                className="inline-flex items-center gap-1 text-sm font-semibold text-vert hover:underline"
              >
                <CheckCheck className="size-4" /> Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted">Aucune notification.</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? allHref}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 px-4 py-3 transition-colors hover:bg-sunken ${n.read ? "" : "bg-vert-soft/40"}`}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-mena"}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{n.title}</span>
                    <span className="line-clamp-2 block text-sm text-muted">{n.body}</span>
                    <span className="mt-1 block text-xs text-muted">{n.createdAt}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={allHref}
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-vert hover:bg-sunken"
          >
            Voir tout
          </Link>
        </div>
      )}
    </div>
  );
}
