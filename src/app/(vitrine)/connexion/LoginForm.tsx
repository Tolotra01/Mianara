"use client";

import { CircleAlert, Eye, EyeOff, LogIn } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ suite }: { suite?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  const [show, setShow] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        // Envoi manuel : l'identifiant reste saisi après une erreur.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {suite && <input type="hidden" name="suite" value={suite} />}
      <div>
        <label htmlFor="identifiant" className="text-sm font-semibold">
          Matricule ou identifiant
        </label>
        <input
          id="identifiant"
          name="identifiant"
          autoComplete="username"
          required
          placeholder="BAC2027-S-00001"
          className="field-input mt-1.5 h-12 font-mono font-semibold tracking-wide placeholder:font-normal"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-semibold">
          Mot de passe
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="field-input h-12 pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>
      {state && (
        <p
          role="alert"
          className="anim-scale flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-vert font-semibold text-on-vert transition-all hover:bg-vert-hover active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? (
          <span
            className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : (
          <LogIn className="size-5" />
        )}
        Se connecter
      </button>
    </form>
  );
}
