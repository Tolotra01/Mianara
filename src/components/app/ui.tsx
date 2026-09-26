import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Info,
  type LucideIcon,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------- Mise en page ---------- */

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-vert"
          >
            ← {back.label}
          </Link>
        )}
        {eyebrow && <p className="t-overline text-mena">{eyebrow}</p>}
        <h1 className="t-h1 mt-1 text-balance">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-line bg-raised shadow-sm ${className ?? ""}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="t-h3">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

/* ---------- Boutons ---------- */

const BUTTON = {
  primary: "bg-vert text-on-vert hover:bg-vert-hover shadow-sm",
  secondary: "border border-line-strong bg-raised text-ink hover:border-vert hover:text-vert",
  ghost: "text-ink hover:bg-sunken",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
  soleil: "bg-soleil text-ink hover:brightness-95 shadow-sm",
} as const;

export type ButtonVariant = keyof typeof BUTTON;

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  const sizing = size === "sm" ? "h-9 px-3 text-sm gap-1.5" : "h-11 px-4 gap-2";
  return `inline-flex items-center justify-center rounded-md font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${sizing} ${BUTTON[variant]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <button className={`${buttonClass(variant, size)} ${className ?? ""}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <Link className={`${buttonClass(variant, size)} ${className ?? ""}`} {...props} />;
}

/* ---------- Statuts (charte : toujours une icône et un mot) ---------- */

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE: Record<Tone, { className: string; icon: LucideIcon }> = {
  success: { className: "bg-vert-soft text-vert", icon: CircleCheck },
  warning: { className: "bg-warning-soft text-warning", icon: Clock },
  danger: { className: "bg-danger-soft text-danger", icon: CircleX },
  info: { className: "bg-info-soft text-info", icon: Info },
  neutral: { className: "bg-sunken text-muted", icon: CircleDashed },
  brand: { className: "bg-mena-soft text-mena", icon: CircleAlert },
};

export function StatusBadge({
  tone,
  children,
  icon,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  const t = TONE[tone];
  const Icon = icon ?? t.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${t.className}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
}) {
  const t = TONE[tone];
  const Icon = tone === "warning" ? TriangleAlert : t.icon;
  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-4 ${t.className}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="text-sm">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="mt-0.5 text-ink">{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Indicateurs ---------- */

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "brand" | "soleil" | "mena" | "info" | "danger";
  hint?: ReactNode;
  href?: string;
}) {
  const tint = {
    brand: "bg-vert-soft text-vert",
    soleil: "bg-soleil-soft text-warning",
    mena: "bg-mena-soft text-mena",
    info: "bg-info-soft text-info",
    danger: "bg-danger-soft text-danger",
  }[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <span
          className={`grid size-10 place-items-center rounded-xl ${tint} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </>
  );
  const cls =
    "group block rounded-2xl border border-line bg-raised p-5 shadow-sm transition-all duration-200";
  return href ? (
    <Link href={href} className={`${cls} hover:-translate-y-0.5 hover:border-vert hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Barre de progression horizontale (0 → 100). */
export function Progress({
  value,
  tone = "vert",
  label,
}: {
  value: number;
  tone?: "vert" | "soleil" | "mena";
  label?: string;
}) {
  const color = { vert: "bg-vert", soleil: "bg-soleil", mena: "bg-mena" }[tone];
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-sunken"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------- Données ---------- */

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className ?? ""}`}>
      <table className="data-table">{children}</table>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="relative grid size-16 place-items-center rounded-2xl bg-vert-soft text-vert">
        <Icon className="size-8" aria-hidden />
        <span className="absolute -right-1 -bottom-1 size-4 rounded-full bg-soleil ring-4 ring-raised" />
      </span>
      <p className="t-h3 mt-4">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function KeyValues({ items }: { items: { label: string; value: ReactNode; mono?: boolean }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs font-bold tracking-wide text-muted uppercase">{i.label}</dt>
          <dd className={`mt-0.5 font-semibold ${i.mono ? "font-mono tracking-wide" : ""}`}>
            {i.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover ring-2 ring-raised"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-vert font-bold text-on-vert ring-2 ring-raised"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Code à chasse fixe (matricules, références) : 0 et O distincts. */
export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono font-semibold tracking-wide">{children}</span>;
}

/* ---------- Formulaires ---------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-danger">
          <CircleAlert className="size-4" aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}
