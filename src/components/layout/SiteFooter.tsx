import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import type { Dict } from "@/lib/i18n";

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
    <footer className="mt-24 bg-sunken">
      <div className="lamba" aria-hidden />
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-10 w-auto" />
          <p className="mt-4 font-semibold">{t.footer.tagline}</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{t.footer.disclaimer}</p>
        </div>
        <FooterCol title={t.footer.guide}>
          {guide.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-vert hover:underline">
              {l.label}
            </Link>
          ))}
        </FooterCol>
        <FooterCol title={t.footer.about}>
          {site.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-vert hover:underline">
              {l.label}
            </Link>
          ))}
        </FooterCol>
        <FooterCol title={t.footer.official}>
          {official.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="hover:text-vert hover:underline"
            >
              {l.label} <ExternalLink className="ml-0.5 inline size-3.5 align-[-2px]" aria-hidden />
            </a>
          ))}
        </FooterCol>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1200px] px-4 py-5 text-sm text-muted sm:px-8">
          © {new Date().getFullYear()} Mianara
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="t-overline text-muted">{title}</p>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
