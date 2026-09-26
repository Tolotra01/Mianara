import { CircleHelp, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-site px-4 sm:px-8 2xl:px-12 ${className ?? ""}`}>{children}</div>;
}

export function SectionTitle({
  overline,
  title,
  lead,
  action,
  center,
  animate = true,
}: {
  overline?: string;
  title: string;
  lead?: string;
  action?: ReactNode;
  center?: boolean;
  /** `false` quand la section parente est déjà révélée : évite un double mouvement. */
  animate?: boolean;
}) {
  const body = (
    <div
      className={`mb-10 flex gap-4 ${
        center ? "flex-col items-center text-center" : "flex-wrap items-end justify-between"
      }`}
    >
      <div className="max-w-2xl">
        {overline && <p className="t-overline text-mena">{overline}</p>}
        <h2 className="t-h1 mt-2 text-balance">{title}</h2>
        {lead && <p className="t-body-lg mt-3 text-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );

  return animate ? <Reveal>{body}</Reveal> : body;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-vert text-on-vert hover:bg-vert-hover"
      : "border border-line-strong bg-raised text-ink hover:border-vert hover:text-vert";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 font-semibold transition-colors ${styles} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

export const buttonClass = {
  primary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-vert px-5 font-semibold text-on-vert transition-colors hover:bg-vert-hover",
  secondary:
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-line-strong bg-raised px-5 font-semibold text-ink transition-colors hover:border-vert hover:text-vert",
};

/** Badge « À confirmer » : information non vérifiée auprès d'un texte officiel. */
export function ToConfirm({ label = "À confirmer" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-warning-soft px-2 py-0.5 text-xs font-bold whitespace-nowrap text-warning">
      <CircleHelp className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function SourceLink({ source }: { source?: { label: string; url: string } | null }) {
  if (!source) return null;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-muted underline decoration-line-strong underline-offset-2 hover:text-vert"
    >
      Source : {source.label}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  );
}

/** En-tête illustré des pages intérieures. */
export function PageHero({
  overline,
  title,
  lead,
  art,
  children,
}: {
  overline: string;
  title: string;
  lead?: string;
  art: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-raised">
      <Container className="grid items-center gap-6 py-10 md:grid-cols-[1.2fr_1fr] md:py-14">
        {/* Le décalage de 90 ms fait arriver l'illustration après le titre :
            la page se lit dans l'ordre, au lieu d'apparaître d'un bloc. */}
        <Reveal>
          <p className="t-overline text-mena">{overline}</p>
          <h1 className="t-display mt-3 text-balance">{title}</h1>
          {lead && <p className="t-body-lg mt-4 max-w-xl text-muted">{lead}</p>}
          {children}
        </Reveal>
        <Reveal delay={90} className="mx-auto w-full max-w-md">
          {art}
        </Reveal>
      </Container>
    </section>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {item.href ? (
              <Link href={item.href} className="underline-offset-2 hover:text-vert hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
