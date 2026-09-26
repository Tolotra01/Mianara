import type { Metadata } from "next";
import { ArrowRight, Building, GraduationCap, HelpCircle, School, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginArt } from "@/components/illustrations/Spots";
import { getCurrentUser, HOME_BY_ROLE } from "@/lib/auth";
import { Container } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

const SPACES = [
  { icon: GraduationCap, accent: "text-vert bg-vert/10" },
  { icon: School, accent: "text-mena bg-mena/10" },
  { icon: Building, accent: "text-soleil bg-soleil/10" },
  { icon: ShieldCheck, accent: "text-info bg-info/10" },
];

const T = {
  fr: {
    online: "En ligne",
    overline: "Espace personnel",
    welcome: "indray",
    lead: "Une seule porte d'entrée, quatre espaces adaptés à votre rôle.",
    spacesTitle: "Les espaces",
    spaces: [
      { label: "Candidat", desc: "Suivre son dossier" },
      { label: "Établissement", desc: "Gérer ses élèves" },
      { label: "Office du Bacc", desc: "Pilotage national" },
      { label: "Administration", desc: "Supervision" },
    ],
    login: "Connexion",
    title: "Content de vous revoir.",
    subtitle: "Avec les identifiants de votre convocation.",
    noAccount: "Pas encore de compte ?",
    noAccountText:
      "Rien à créer : votre compte est ouvert par l'Office du Bacc à partir de la liste envoyée par votre lycée. Vos identifiants figurent sur votre convocation.",
    help: "Besoin d'aide ?",
  },
  mg: {
    online: "Mandeha",
    overline: "Toerana manokana",
    welcome: "indray",
    lead: "Varavarana iray ihany, toerana efatra mifanaraka amin'ny andraikitrao.",
    spacesTitle: "Ireo toerana",
    spaces: [
      { label: "Kandida", desc: "Hanaraka ny antontan-taratasiny" },
      { label: "Sekoly", desc: "Hitantana ny mpianany" },
      { label: "Office du Bacc", desc: "Fitantanana nasionaly" },
      { label: "Fitantanana", desc: "Fanaraha-maso" },
    ],
    login: "Fidirana",
    title: "Faly mahita anao indray.",
    subtitle: "Amin'ny laharana fidirana hita ao amin'ny taratasy fiantsoana anao.",
    noAccount: "Mbola tsy manana kaonty ?",
    noAccountText:
      "Tsy mila mamorona ianao : ny Office du Bacc no manokatra ny kaontinao avy amin'ny lisitra nalefan'ny lycée-nao. Hita ao amin'ny taratasy fiantsoana anao ny laharana fidiranao.",
    help: "Mila fanampiana ?",
  },
};

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/compte/mot-de-passe" : HOME_BY_ROLE[user.role]);
  const [{ suite }, lang] = await Promise.all([searchParams, getLang()]);
  const t = T[lang];

  return (
    <Container className="py-8 sm:py-12 lg:py-16">
      {/* ✅ Conteneur principal : carte unique avec ombre profonde et bordure
          marquée. Ombre colorée (vert) pour un effet "premium". */}
      <div className="relative isolate">
        {/* Halo décoratif derrière la carte — invisible sur mobile */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 hidden opacity-30 blur-3xl md:block"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 30%, var(--color-vert) 0%, transparent 60%), radial-gradient(50% 50% at 80% 70%, var(--color-mena) 0%, transparent 60%)",
          }}
        />

        <div className="grid overflow-hidden rounded-3xl border border-line bg-raised shadow-2xl sm:rounded-4xl lg:grid-cols-[5fr_6fr]">
          {/* ═══════════ Colonne gauche : identité ═══════════ */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-vert-soft p-6 sm:p-10 lg:p-12">
            {/* Motif décoratif : lignes horizontales discrètes (évoque les
                rizières en terrasses) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 18px, currentColor 18px 19px)",
              }}
            />

            {/* Pastille "identité" en haut à droite */}
            <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-raised/70 px-2.5 py-1 text-[10px] font-bold tracking-wider text-ink/70 backdrop-blur-sm uppercase">
                <span className="a-pulse size-1.5 rounded-full bg-vert" aria-hidden />
                {t.online}
              </span>
            </div>

            <div className="relative">
              <p className="t-overline text-mena">{t.overline}</p>
              <h1 className="t-h1 mt-2 text-balance">
                Tongasoa <span className="text-vert">{t.welcome}</span> !
              </h1>
              <p className="mt-3 max-w-sm text-sm text-muted sm:text-base">{t.lead}</p>
            </div>

            {/* Illustration avec cadre élégant */}
            <div className="relative my-8 flex justify-center">
              {/* Coin décoratifs autour de l'art */}
              <span
                aria-hidden
                className="absolute -top-2 -left-2 size-6 rounded-tl-2xl border-t-2 border-l-2 border-vert/40 sm:-top-3 sm:-left-3 sm:size-8"
              />
              <span
                aria-hidden
                className="absolute -top-2 -right-2 size-6 rounded-tr-2xl border-t-2 border-r-2 border-vert/40 sm:-top-3 sm:-right-3 sm:size-8"
              />
              <span
                aria-hidden
                className="absolute -bottom-2 -left-2 size-6 rounded-bl-2xl border-b-2 border-l-2 border-vert/40 sm:-bottom-3 sm:-left-3 sm:size-8"
              />
              <span
                aria-hidden
                className="absolute -right-2 -bottom-2 size-6 rounded-br-2xl border-r-2 border-b-2 border-vert/40 sm:-bottom-3 sm:-right-3 sm:size-8"
              />
              <div className="w-full max-w-[220px] sm:max-w-[280px]">
                <LoginArt />
              </div>
            </div>

            {/* Les 4 espaces — au lieu d'un grid 2x2, une liste verticale
                avec icône, label et description. Beaucoup plus lisible. */}
            <div className="relative">
              <p className="t-overline text-ink/50">{t.spacesTitle}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {SPACES.map((s, i) => (
                  <li
                    key={t.spaces[i].label}
                    className="group flex items-start gap-3 rounded-2xl bg-raised/70 p-3 backdrop-blur-sm transition-all hover:bg-raised hover:shadow-md"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${s.accent} transition-transform group-hover:scale-110`}
                    >
                      <s.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight">{t.spaces[i].label}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{t.spaces[i].desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ═══════════ Colonne droite : formulaire ═══════════ */}
          <div className="relative p-6 sm:p-10 lg:p-12">
            {/* Filigrane décoratif en haut à droite */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-6 -right-6 font-mono text-[8rem] leading-none font-black text-ink/[0.02] select-none sm:text-[10rem]"
            >
              ✦
            </span>

            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-vert text-on-vert">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <p className="text-xs font-bold tracking-widest text-muted uppercase">{t.login}</p>
              </div>
              <h2 className="t-h2 mt-4">{t.title}</h2>
              <p className="mt-2 text-sm text-muted sm:text-base">{t.subtitle}</p>
            </div>

            {/* Formulaire */}
            <div className="relative mt-8">
              <LoginForm suite={typeof suite === "string" ? suite : undefined} lang={lang} />
            </div>

            {/* ✅ Section "Pas encore de compte" — remontée visuellement avec
                icône, bordure d'accent et ton moins passif. */}
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-line/60 bg-sunken/70 p-5">
              {/* Accent vertical à gauche */}
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-vert to-mena" />

              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-vert/10 text-vert">
                  <HelpCircle className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">{t.noAccount}</p>
                  <p className="mt-1 text-sm text-muted">{t.noAccountText}</p>
                  <a
                    href="#aide"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-vert hover:underline"
                  >
                    {t.help}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
