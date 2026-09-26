/** Résultat renvoyé par les actions serveur aux formulaires. */
export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Horodatage : deux résultats identiques déclenchent quand même un toast. */
  at: number;
  /** Donnée à montrer une seule fois (mot de passe temporaire, par exemple). */
  secret?: string;
} | null;

export const ok = (message: string, extra: Partial<NonNullable<ActionState>> = {}): ActionState => ({
  ok: true,
  message,
  at: Date.now(),
  ...extra,
});

export const fail = (message: string, fieldErrors?: Record<string, string>): ActionState => ({
  ok: false,
  message,
  fieldErrors,
  at: Date.now(),
});

/** Erreurs Zod → { champ: message }. */
export function zodErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}
