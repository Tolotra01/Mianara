import { LogIn } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex h-18 max-w-[1200px] items-center gap-4 px-4 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="Mianara — accueil">
          <Logo className="h-9 w-auto" />
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2 md:justify-center">
          <NavLinks items={items} menuLabel={t.menu} login={{ href: "/connexion", label: t.nav.login }} />
        </div>
        <div className="flex items-center gap-3">
          <LangSwitch lang={lang} label={t.langLabel} />
          <Link
            href="/connexion"
            className="hidden items-center gap-2 rounded-md bg-vert px-4 py-2.5 font-semibold text-on-vert transition-colors hover:bg-vert-hover sm:inline-flex"
          >
            <LogIn className="size-5" />
            {t.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
