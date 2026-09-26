"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

type Toast = { id: number; ok: boolean; message: string };
const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Pile de notifications éphémères, en bas à droite. Lit aussi `?ok=` après une redirection. */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <FlashFromUrl push={push} />
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-slide-right pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-raised p-4 shadow-md"
          >
            {t.ok ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-vert" aria-hidden />
            ) : (
              <CircleX className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            )}
            <p className="flex-1 text-sm font-semibold">{t.message}</p>
            <button
              type="button"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="text-muted hover:text-ink"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function FlashFromUrl({ push }: { push: (t: Omit<Toast, "id">) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = params.get("ok");
  useEffect(() => {
    if (!message) return;
    push({ ok: true, message });
    const next = new URLSearchParams(params);
    next.delete("ok");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [message, params, pathname, push, router]);
  return null;
}
