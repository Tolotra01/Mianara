import { Icon } from "@/components/Icon";
import type { Tip } from "@/content/bac";

const TINTS = [
  "bg-vert-soft text-vert",
  "bg-soleil-soft text-warning",
  "bg-mena-soft text-mena",
  "bg-info-soft text-info",
];

export function TipGrid({ tips }: { tips: Tip[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tips.map((tip, i) => (
        <li key={tip.title} className="flex gap-4 rounded-3xl border border-line bg-raised p-5 shadow-sm">
          <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${TINTS[i % TINTS.length]}`}>
            <Icon name={tip.icon} className="size-7" />
          </span>
          <span>
            <span className="t-h3 block">{tip.title}</span>
            <span className="mt-1 block text-muted">{tip.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
