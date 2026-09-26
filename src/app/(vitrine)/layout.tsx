import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getDict } from "@/lib/lang";

export default async function VitrineLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDict();
  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-md focus:bg-vert focus:px-4 focus:py-2 focus:text-on-vert"
      >
        {t.skip}
      </a>
      <SiteHeader t={t} lang={lang} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter t={t} />
      <AssistantWidget t={t.chat} lang={lang} suggestions={t.assistant.examples} />
    </>
  );
}
