import { Bust, P } from "./parts";

/** L'assistant Mianara : une « grande sœur » qui a réussi son Bacc. */
export function AssistantAvatar({
  className,
  title = "Assistant Mianara",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`ill overflow-hidden rounded-full ${className ?? ""}`}
      role="img"
      aria-label={title}
    >
      <rect width="64" height="64" fill="var(--vert-soft)" />
      <Bust x={32} y={27} scale={1.08} hair="bun" skin={P.skin[1]} shirt={P.vert} />
      <circle cx="39" cy="56" r="2.6" fill={P.soleil} />
    </svg>
  );
}
