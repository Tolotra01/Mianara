import { ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import type { Dict } from "@/lib/i18n";

const LINK =
  "group inline-flex items-center gap-1.5 font-medium text-ink/80 transition-colors hover:text-vert";

export function SiteFooter({ t }: { t: Dict }) {
  const guide = [
    { href: "/guide/series", label: "Séries L, S, OSE" },
    { href: "/guide/coefficients", label: "Coefficients" },
    { href: "/guide/dossier", label: "Dossier d'inscription" },
    { href: "/guide/calendrier", label: "Calendrier" },
    { href: "/guide/jour-j", label: "Le jour J" },
    { href: "/guide/resultats", label: "Résultats et après" },
  ];
  const site = [
    { href: "/resultats", label: "Résultats du Bac" },
    { href: "/actualites", label: t.nav.news },
    { href: "/aide", label: t.nav.help },
    { href: "/connexion", label: t.nav.login },
  ];
  const official = [
    { href: "https://bacc.digital.gov.mg/", label: t.footer.results },
    { href: "https://www.mesupres.gov.mg/", label: "MESUPRES" },
    { href: "https://www.education.gov.mg/", label: "Ministère de l'Éducation nationale" },
  ];

  return (
    <footer className="footer-band mt-24">
      {/* Toujours sombre (cf. `.footer-band`) : le pied de page ferme le site
          sur le même aplat que l'accueil, quel que soit le thème. */}
      <div className="lamba" aria-hidden />
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-8">
          <div>
            <Link href="/" aria-label="Mianara — accueil">
              <Logo className="h-10 w-auto" />
            </Link>
            <p className="t-h3 mt-6 text-balance">{t.footer.tagline}</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t.footer.disclaimer}</p>
          </div>
          <FooterCol title={t.footer.guide}>
            {guide.map((l) => (
              <FooterLink key={l.href} {...l} />
            ))}
          </FooterCol>
          <FooterCol title={t.footer.about}>
            {site.map((l) => (
              <FooterLink key={l.href} {...l} />
            ))}
          </FooterCol>
          <FooterCol title={t.footer.official}>
            {official.map((l) => (
              <FooterLink key={l.href} {...l} external />
            ))}
          </FooterCol>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-line py-6 text-sm text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Mianara</p>
          <p className="font-mono text-xs uppercase tracking-[0.22em]">FR · MG</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-overline text-muted">{title}</p>
      <ul className="mt-5 flex flex-col gap-3.5">{children}</ul>
    </div>
  );
}

/** Un lien de colonne : la flèche n'apparaît qu'au survol, pour éviter que la
 *  colonne ne se lise comme une liste de puces. */
function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={LINK}>
          {label}
          <ExternalLink className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </a>
      ) : (
        <Link href={href} className={LINK}>
          {label}
          <ChevronRight
            className="size-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </Link>
      )}
    </li>
  );
}
