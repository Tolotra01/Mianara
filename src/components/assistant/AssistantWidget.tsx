"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { AssistantAvatar } from "@/components/illustrations/AssistantAvatar";
import { AssistantChat } from "./AssistantChat";
import { ASK_EVENT } from "./events";

/** Assistant flottant, présent sur toutes les pages sauf la page Aide (qui l'intègre). */
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

  if (pathname === "/aide") return null;

  return (
    <>
      {open && (
        <section
          aria-label={t.title}
          className="a-pop fixed right-4 bottom-24 z-50 flex h-[min(620px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-raised shadow-md"
        >
          <header className="flex items-center gap-3 bg-vert px-4 py-3 text-on-vert">
            <AssistantAvatar className="size-10 ring-2 ring-on-vert/40" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t.title}</p>
              <p className="truncate text-sm opacity-85">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full hover:bg-white/15"
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
            className="flex-1"
          />
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t.close : t.open}
        className="group fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-full bg-vert py-2 pr-5 pl-2 text-on-vert shadow-md transition-transform hover:-translate-y-0.5 hover:bg-vert-hover"
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
