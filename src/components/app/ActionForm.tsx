"use client";

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { ActionState } from "@/lib/action";
import { useToast } from "./Toaster";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const FormStateContext = createContext<{ state: ActionState; pending: boolean }>({
  state: null,
  pending: false,
});

/** Erreurs de champ et état d'envoi du formulaire parent. */
export const useFormResult = () => useContext(FormStateContext);

/**
 * Formulaire relié à une action serveur : toast à la réponse, erreurs par
 * champ via useFormResult(), remise à zéro optionnelle après succès.
 */
export function ActionForm({
  action,
  children,
  resetOnSuccess,
  onSuccess,
  ...props
}: Omit<ComponentProps<"form">, "action" | "children"> & {
  action: Action;
  children: ReactNode | ((ctx: { state: ActionState; pending: boolean }) => ReactNode);
  resetOnSuccess?: boolean;
  onSuccess?: (state: NonNullable<ActionState>) => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    toast({ ok: state.ok, message: state.message });
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
    // Un nouveau résultat (horodaté) déclenche le toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);

  return (
    <FormStateContext.Provider value={{ state, pending }}>
      <form
        ref={ref}
        {...props}
        // Envoi manuel : React ne vide pas le formulaire, la saisie est conservée en cas d'erreur.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {typeof children === "function" ? children({ state, pending }) : children}
      </form>
    </FormStateContext.Provider>
  );
}

/** Bouton d'envoi qui affiche un indicateur pendant l'envoi. */
export function SubmitButton({ children, className, ...props }: ComponentProps<"button">) {
  const { pending } = useFormResult();
  return (
    <button type="submit" disabled={pending || props.disabled} className={className} {...props}>
      {pending && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/** Message d'erreur d'un champ, sous l'input. */
export function FieldError({ name }: { name: string }) {
  const { state } = useFormResult();
  const error = state && !state.ok ? state.fieldErrors?.[name] : undefined;
  if (!error) return null;
  return <p className="anim-fade mt-1 text-sm font-semibold text-danger">{error}</p>;
}
