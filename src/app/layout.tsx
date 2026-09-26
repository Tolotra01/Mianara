import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getDict } from "@/lib/lang";
import "./globals.css";

const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  weight: "200 800",
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mianara — Ton Bac, pas à pas", template: "%s · Mianara" },
  description:
    "Le guide illustré du Baccalauréat à Madagascar : séries L, S et OSE, coefficients, dossier d'inscription, calendrier, jour J et résultats. Avec un assistant IA en français et en malagasy.",
  applicationName: "Mianara",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1A16" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lang, t } = await getDict();
  return (
    <html lang={lang === "mg" ? "mg" : "fr"} className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-dvh flex-col">
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
      </body>
    </html>
  );
}
