import { BookOpen, MessagesSquare, PencilLine } from "lucide-react";

const KIND = {
  course: { label: "Cours", icon: BookOpen, className: "bg-vert-soft text-vert" },
  training: { label: "Exercices", icon: PencilLine, className: "bg-info-soft text-info" },
  coaching: { label: "Tutorat", icon: MessagesSquare, className: "bg-soleil-soft text-warning" },
} as const;

/** Type d'un contenu pédagogique (cours, exercices, tutorat). */
export function KindTag({ kind }: { kind: string }) {
  const k = KIND[kind as keyof typeof KIND] ?? KIND.course;
  const Icon = k.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${k.className}`}
    >
      <Icon className="size-3.5" aria-hidden /> {k.label}
    </span>
  );
}
