"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { AssistantAvatar } from "@/components/illustrations/AssistantAvatar";
import { AssistantChat } from "./AssistantChat";
import { ASK_EVENT } from "./events";

/**
 * Assistant flottant, présent sur toutes les pages sauf la page Aide (qui l'intègre).
 * Sur téléphone il s'ouvre en plein écran ; à partir de `sm`, en panneau flottant.
 */
export function AssistantWidget({
  t,
  lang,
  suggestions,
}: {
  t: Dict["chat"];
  lang: Lang;
  suggestions: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const onAsk = (e: Event) => {
      const question = (e as CustomEvent<string | undefined>).detail;
      setOpen(true);
      if (question) setPending(question);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener(ASK_EVENT, onAsk);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(ASK_EVENT, onAsk);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // En plein écran (téléphone), la page derrière ne doit pas défiler.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (pathname === "/aide") return null;

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t.title}
          className="a-pop fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-raised sm:inset-auto sm:right-4 sm:bottom-24 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[min(420px,calc(100vw-2rem))] sm:rounded-3xl sm:border sm:border-line sm:shadow-md lg:right-6 lg:w-[440px]"
        >
          <header className="flex items-center gap-3 bg-vert px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-on-vert">
            <AssistantAvatar className="size-10 shrink-0 ring-2 ring-on-vert/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{t.title}</p>
              <p className="truncate text-sm opacity-85">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/15"
              aria-label={t.close}
            >
              <X className="size-5" />
            </button>
          </header>
          <AssistantChat
            t={t}
            lang={lang}
            suggestions={suggestions}
            pending={pending}
            onPendingSent={() => setPending(null)}
            autoFocus
            className="flex-1"
          />
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t.close : t.open}
        className={`group fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 items-center gap-3 rounded-full bg-vert p-1.5 text-on-vert shadow-md transition-transform hover:-translate-y-0.5 hover:bg-vert-hover sm:right-4 sm:bottom-4 sm:flex sm:py-2 sm:pr-5 sm:pl-2 lg:right-6 lg:bottom-6 ${open ? "hidden" : "flex"}`}
      >
        <span className="relative">
          <AssistantAvatar className="size-12 ring-2 ring-on-vert/40" />
          <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-vert bg-soleil" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-bold">{t.title}</span>
          <span className="block text-xs leading-tight opacity-85">{open ? t.close : t.open}</span>
        </span>
      </button>
    </>
  );
}
