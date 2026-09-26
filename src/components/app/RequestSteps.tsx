import { Check, X } from "lucide-react";

const STEPS = ["Demande déposée", "Paiement vérifié", "Retrait fixé", "Document retiré"];
const INDEX: Record<string, number> = { pending: 0, validated: 1, pickup_scheduled: 2, delivered: 3 };

/** Suivi d'une demande : En attente → Validée → Date de retrait fixée → Retirée (CAN-11). */
export function RequestSteps({ status }: { status: string }) {
  const rejected = status === "rejected";
  const current = rejected ? 0 : INDEX[status];
  return (
    <ol className="flex items-start">
      {STEPS.map((label, i) => {
        const done = !rejected && i <= current;
        const isRejected = rejected && i === 1;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span className="absolute top-4 right-1/2 h-0.5 w-full bg-line" aria-hidden>
                <span
                  className={`block h-full bg-vert transition-[width] duration-700 ${done ? "w-full" : "w-0"}`}
                />
              </span>
            )}
            <span
              className={`relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold ring-4 ring-raised transition-colors duration-500 ${
                isRejected
                  ? "bg-danger text-white"
                  : done
                    ? "bg-vert text-on-vert"
                    : i === current + 1 && !rejected
                      ? "bg-soleil text-ink"
                      : "bg-sunken text-muted"
              }`}
            >
              {isRejected ? <X className="size-4" /> : done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`mt-2 text-xs font-semibold ${done || isRejected ? "text-ink" : "text-muted"}`}>
              {isRejected ? "Rejetée" : label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
