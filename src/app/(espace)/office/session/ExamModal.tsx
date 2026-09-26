"use client";

import { Pencil, Plus } from "lucide-react";
import { ModalButton } from "@/components/app/ConfirmAction";
import { ExamForm } from "./ExamForm";

type Props = Omit<React.ComponentProps<typeof ExamForm>, "onDone">;

export function ExamModal(props: Props) {
  return props.exam ? (
    <ModalButton
      label={<span className="sr-only">Modifier</span>}
      title="Modifier l'épreuve"
      variant="ghost"
      size="sm"
      icon={<Pencil className="size-4" aria-hidden />}
    >
      {(close) => <ExamForm {...props} onDone={close} />}
    </ModalButton>
  ) : (
    <ModalButton
      label="Ajouter une épreuve"
      title={`Nouvelle épreuve · série ${props.serieCode}`}
      variant="secondary"
      size="sm"
      icon={<Plus className="size-4" />}
    >
      {(close) => <ExamForm {...props} onDone={close} />}
    </ModalButton>
  );
}
