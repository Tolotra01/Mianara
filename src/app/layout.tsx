import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getLang } from "@/lib/lang";
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
  title: { default: "Mianara — Ton Bacc, pas à pas", template: "%s · Mianara" },
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
  const lang = await getLang();
  return (
    <html
      lang={lang === "mg" ? "mg" : "fr"}
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
