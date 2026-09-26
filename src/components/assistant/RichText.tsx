import { Fragment, type ReactNode } from "react";

/**
 * Rendu minimal et sûr des réponses de l'assistant : paragraphes, listes à
 * puces ou numérotées, **gras** et liens https. Aucun HTML n'est injecté.
 */
export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={blocks.length}
        className={`my-1.5 space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(
      <p key={blocks.length} className={heading ? "mt-2 font-bold" : "my-1.5"}>
        {inline(heading ? heading[1] : line)}
      </p>,
    );
  }
  flush();
  return <>{blocks}</>;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|https:\/\/[^\s)]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("https://")) {
      const url = part.replace(/[.,;:]$/, "");
      return (
        <Fragment key={i}>
          <a href={url} target="_blank" rel="noreferrer" className="break-all text-vert underline">
            {url.replace(/^https:\/\//, "")}
          </a>
          {part.slice(url.length)}
        </Fragment>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
