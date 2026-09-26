"use client";

import { Send } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { sendApplications } from "./actions";

export function SendButton({ count }: { count: number }) {
  return (
    <ConfirmAction
      action={sendApplications}
      icon={<Send className="size-5" />}
      label={`Envoyer à l'Office (${count})`}
      title={`Envoyer ${count} dossier(s) à l'Office du Bac ?`}
      description="Une fois envoyés, les dossiers ne sont plus modifiables, sauf s'ils vous sont renvoyés comme incomplets."
      confirmLabel="Envoyer"
    />
  );
}
