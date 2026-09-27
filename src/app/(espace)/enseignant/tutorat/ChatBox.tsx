"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { sendTeacherMessage } from "../actions";

export type ChatMessage = { id: string; sender: "candidate" | "teacher"; text: string; time: string };

/** Fil de discussion (défile en bas à chaque nouveau message) et zone de saisie. */
export function ChatBox({
  sessionId,
  messages,
  open,
}: {
  sessionId: string;
  messages: ChatMessage[];
  open: boolean;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  return (
    <div className="flex h-[min(70vh,640px)] flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Aucun message. Présentez-vous et demandez à l&apos;élève ce qu&apos;il souhaite travailler.
          </p>
        )}
        {messages.map((m) =>
          m.sender === "teacher" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-vert px-4 py-2.5 text-on-vert">
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-right text-xs opacity-75">{m.time}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex">
              <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-sunken px-4 py-2.5">
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-xs text-muted">{m.time}</p>
              </div>
            </div>
          ),
        )}
        <div ref={end} />
      </div>
      {open ? (
        <ActionForm action={sendTeacherMessage} resetOnSuccess className="border-t border-line p-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <div className="flex items-end gap-2">
            <textarea
              name="text"
              required
              rows={2}
              maxLength={2000}
              placeholder="Votre réponse…"
              className="field-input min-h-12 flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <SubmitButton className="grid size-12 shrink-0 place-items-center rounded-md bg-vert text-on-vert hover:bg-vert-hover disabled:opacity-40">
              <SendHorizontal className="size-5" aria-label="Envoyer" />
            </SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm font-semibold text-muted">
          Séance terminée : lecture seule.
        </p>
      )}
    </div>
  );
}
