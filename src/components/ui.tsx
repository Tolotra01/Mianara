import { CircleHelp, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { COMMON, formatDateLang, type Lang } from "@/lib/i18n";
import { Reveal } from "@/components/Reveal";
import { PageScene, type SceneName } from "@/components/illustrations/PageScenes";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`mx-auto w-full max-w-site px-4 sm:px-8 2xl:px-12 ${className ?? ""}`}>{children}</div>
  );
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
export function ToConfirm({ label, lang = "fr" }: { label?: string; lang?: Lang }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-warning-soft px-2 py-0.5 text-xs font-bold whitespace-nowrap text-warning">
      <CircleHelp className="size-3.5" aria-hidden />
      {label ?? COMMON[lang].toConfirm}
    </span>
  );
}

export function SourceLink({
  source,
  lang = "fr",
}: {
  source?: { label: string; url: string } | null;
  lang?: Lang;
}) {
  if (!source) return null;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-muted underline decoration-line-strong underline-offset-2 hover:text-vert"
    >
      {COMMON[lang].source} : {source.label}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  );
}

/**
 * En-tête des pages intérieures, dans la lignée du héros d'accueil : nuit
 * malgache (sombre dans les deux thèmes), titre en grand dont un morceau
 * (`accent`) passe en soleil, comme « Ton Bacc, ». Chaque page a son propre
 * décor (`scene`), tiré de ce qui la définit : il tient le rôle des élèves de
 * l'accueil.
 */
export function PageHero({
  overline,
  title,
  accent,
  lead,
  scene,
  top,
  children,
}: {
  overline: ReactNode;
  title: string;
  /** Partie du titre mise en couleur (doit figurer telle quelle dans `title`). */
  accent?: string;
  lead?: string;
  /** Décor propre à la page, tiré de ce qui la définit. */
  scene: SceneName;
  /** Contenu au-dessus de l'étiquette (lien retour, par exemple). */
  top?: ReactNode;
  children?: ReactNode;
}) {
  const at = accent ? title.indexOf(accent) : -1;
  const heading =
    at < 0 ? (
      title
    ) : (
      <>
        {title.slice(0, at)}
        <span className="text-warning">{accent}</span>
        {title.slice(at + accent!.length)}
      </>
    );

  return (
    <section className="home-dark hero-band relative isolate overflow-hidden border-b border-line">
      {/* Décor de la page : bande basse sur mobile et tablette, plein cadre à
          partir de lg, comme sur l'accueil. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(190px,50vw,320px)] lg:inset-0 lg:h-auto"
      >
        <PageScene name={scene} framing="mobile" className="lg:hidden" />
        <PageScene name={scene} framing="wide" className="hidden lg:block" />
      </div>
      {/* Voile de lisibilité à gauche, identique à l'accueil. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(96deg, rgba(9,26,21,0.95) 0%, rgba(9,26,21,0.88) 34%, rgba(9,26,21,0.5) 58%, rgba(9,26,21,0.12) 80%, rgba(9,26,21,0) 94%)",
        }}
      />

      <Container className="relative grid gap-10 pt-10 pb-[clamp(236px,64vw,380px)] md:pt-14 lg:min-h-[540px] lg:items-center lg:py-16 2xl:min-h-[600px]">
        {/* Le décalage de 90 ms fait arriver l'illustration après le titre :
            la page se lit dans l'ordre, au lieu d'apparaître d'un bloc. */}
        <Reveal className="max-w-2xl lg:max-w-[min(42rem,52%)]">
          {top}
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-ink/80 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-soleil" aria-hidden />
            {overline}
          </p>
          <h1
            className={`mt-4 leading-[1.06] font-extrabold tracking-[-0.03em] text-balance ${
              // Titres longs (articles) : un cran plus petit pour rester sur trois lignes.
              title.length > 40
                ? "text-[clamp(30px,4.2vw,54px)] 3xl:text-[clamp(54px,3.2vw,68px)]"
                : "text-[clamp(36px,5.6vw,68px)] 3xl:text-[clamp(68px,4.2vw,88px)]"
            }`}
          >
            {heading}
          </h1>
          {lead && <p className="t-body-lg mt-5 max-w-xl text-muted">{lead}</p>}
          {children}
        </Reveal>
      </Container>
    </section>
  );
}

export function Breadcrumb({
  items,
  lang = "fr",
}: {
  items: { href?: string; label: string }[];
  lang?: Lang;
}) {
  return (
    <nav aria-label={COMMON[lang].breadcrumb} className="mb-4 text-sm text-muted">
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

export function formatDate(iso: string, lang: Lang = "fr") {
  return formatDateLang(iso, lang);
}

/** En malagasy : signale que certains contenus (données saisies) restent en français. */
export function FrenchOnlyNote({ lang, className = "mt-4" }: { lang: Lang; className?: string }) {
  if (lang !== "mg") return null;
  return (
    <p className={`flex items-start gap-2 rounded-2xl bg-info-soft px-4 py-3 text-sm text-info ${className}`}>
      <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden />
      {COMMON.mg.frenchOnly}
    </p>
  );
}
