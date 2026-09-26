import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import type { Dict, Lang } from "@/lib/i18n";
import { LangSwitch } from "./LangSwitch";
import { NavLinks } from "./NavLinks";

export function SiteHeader({ t, lang }: { t: Dict; lang: Lang }) {
  const items = [
    { href: "/", label: t.nav.home },
    { href: "/guide", label: t.nav.guide },
    { href: "/actualites", label: t.nav.news },
    { href: "/aide", label: t.nav.help },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-xl">
      {/* Filet lumineux sous la barre : la sépare du contenu qui défile en
         dessous, sans alourdir la bordure. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-vert/70 to-transparent"
      />
      <div className="relative mx-auto flex h-20 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Mianara — accueil">
          {/* L'emblème passe sur une pastille dégradée : le logo cesse d'être un
              élément flottant pour devenir une marque posée. */}
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-vert-soft to-sunken ring-1 ring-line transition-transform duration-300 group-hover:scale-105">
            <Logo className="h-7 w-auto" withWordmark={false} />
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight sm:block">Mianara</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2 md:justify-center">
          <NavLinks items={items} menuLabel={t.menu} login={{ href: "/connexion", label: t.nav.login }} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitch lang={lang} label={t.langLabel} />
          <Link
            href="/connexion"
            className="hidden items-center gap-2 rounded-full bg-linear-to-r from-vert to-vert-hover px-5 py-2.5 text-sm font-bold text-on-vert shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:inline-flex"
          >
            {t.nav.login}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
