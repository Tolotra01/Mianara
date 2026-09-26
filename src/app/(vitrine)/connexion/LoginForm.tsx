"use client";

import { Eye, EyeOff, Info, LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="identifiant" className="text-sm font-semibold">
          Matricule ou identifiant
        </label>
        <input
          id="identifiant"
          name="identifiant"
          autoComplete="username"
          placeholder="BAC2027-S-04587"
          className="mt-1.5 h-12 w-full rounded-md border border-line-strong bg-raised px-3 font-mono font-semibold tracking-wide text-ink placeholder:font-normal placeholder:text-muted"
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
            className="h-12 w-full rounded-md border border-line-strong bg-raised px-3 pr-12 text-ink"
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
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-vert font-semibold text-on-vert transition-colors hover:bg-vert-hover disabled:opacity-60"
      >
        <LogIn className="size-5" /> Se connecter
      </button>
      {state && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-info-soft p-4 text-info">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span className="text-ink">{state.message}</span>
        </p>
      )}
    </form>
  );
}
