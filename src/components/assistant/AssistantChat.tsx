"use client";

import { RotateCcw, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { AssistantAvatar } from "@/components/illustrations/AssistantAvatar";
import { RichText } from "./RichText";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  t: Dict["chat"];
  lang: Lang;
  suggestions: string[];
  /** Question à envoyer dès l'affichage (depuis un bouton « Poser une question »). */
  pending?: string | null;
  onPendingSent?: () => void;
  className?: string;
};

export function AssistantChat({ t, lang, suggestions, pending, onPendingSent, className }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => abort.current?.abort(), []);

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;
      const history: ChatMessage[] = [...messages, { role: "user", content: text }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setError(null);
      setBusy(true);

      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history, lang }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? t.error);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setMessages([...history, { role: "assistant", content: answer }]);
        }
        if (!answer.trim()) throw new Error(t.error);
      } catch (err) {
        if (controller.signal.aborted) return;
        setMessages(history);
        setError(err instanceof Error ? err.message : t.error);
      } finally {
        setBusy(false);
      }
    },
    [busy, lang, messages, t.error],
  );

  // Question envoyée depuis un bouton « Poser une question » : déclenche l'appel réseau.
  useEffect(() => {
    if (!pending) return;
    onPendingSent?.();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void send(pending);
    // Ne réagit qu'à une nouvelle question en attente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const reset = () => {
    abort.current?.abort();
    setMessages([]);
    setError(null);
    setBusy(false);
  };

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        <Bot>
          <p>{t.hello}</p>
        </Bot>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pl-11">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-vert/30 bg-vert-soft px-3 py-1.5 text-left text-sm font-semibold text-vert transition-colors hover:border-vert"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-vert px-4 py-2.5 text-on-vert">
                {m.content}
              </p>
            </div>
          ) : (
            <Bot key={i}>
              {m.content ? (
                <RichText text={m.content} />
              ) : (
                <span className="flex gap-1 py-2" aria-label="…">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="a-typing size-2 rounded-full bg-vert"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </span>
              )}
            </Bot>
          ),
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-line bg-raised p-3"
      >
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="assistant-input">
            {t.placeholder}
          </label>
          <textarea
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={1500}
            placeholder={t.placeholder}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-md border border-line-strong bg-raised px-3 py-3 text-ink placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="grid size-12 shrink-0 place-items-center rounded-md bg-vert text-on-vert transition-colors hover:bg-vert-hover disabled:opacity-40"
            aria-label={t.send}
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
          <span>{t.disclaimer}</span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex shrink-0 items-center gap-1 font-semibold hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> {t.reset}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar className="size-8 shrink-0" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-sunken px-4 py-2.5 text-ink">{children}</div>
    </div>
  );
}
