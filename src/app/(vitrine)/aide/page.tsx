import type { Metadata } from "next";
import { Building2, ChevronDown, School, UserRound } from "lucide-react";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { AssistantAvatar } from "@/components/illustrations/AssistantAvatar";
import { Container, FrenchOnlyNote, PageHero } from "@/components/ui";
import { UNIVERSITIES } from "@/content/bac";
import { getBacData } from "@/lib/data";
import { getDict } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Aide",
  description:
    "Posez votre question à l'assistant Mianara, consultez les questions fréquentes ou trouvez à qui vous adresser.",
};

const T = {
  fr: {
    overline: "Aide",
    title: "On est là pour vous aider",
    accent: "vous aider",
    lead: "Posez votre question à l'assistant, en français ou en malagasy. Pour votre dossier personnel, adressez-vous à un humain.",
    faq: "Questions fréquentes",
    human: "Besoin d'un humain ?",
    humanLead:
      "L'assistant ne voit pas votre dossier. Pour une situation personnelle, voici à qui vous adresser.",
    ecole: "Vous êtes candidat d'école",
    ecoleText: "Votre lycée (direction ou secrétariat) : il dépose et suit votre dossier.",
    libre: "Vous êtes candidat libre",
    libreText: "L'Office du Bacc de l'université de votre province.",
    offices: "Les six Offices du Bacc",
  },
  mg: {
    overline: "Fanampiana",
    title: "Eto izahay hanampy anao",
    accent: "hanampy anao",
    lead: "Apetraho amin'ny mpanampy ny fanontanianao, amin'ny teny frantsay na malagasy. Ho an'ny antontan-taratasinao manokana, manatona olona.",
    faq: "Fanontaniana matetika apetraka",
    human: "Mila olona ?",
    humanLead:
      "Tsy mahita ny antontan-taratasinao ny mpanampy. Raha toe-javatra manokana, ireto no tokony hatonina.",
    ecole: "Kandida avy any an-tsekoly ianao",
    ecoleText:
      "Ny lycée-nao (fitantanana na sekretera) : izy no mametraka sy manaraka ny antontan-taratasinao.",
    libre: "Kandida tsy miankina ianao",
    libreText: "Ny Office du Bacc an'ny oniversiten'ny faritanao.",
    offices: "Ireo Office du Bacc enina",
  },
};

export default async function AidePage() {
  const [{ lang, t }, data] = await Promise.all([getDict(), getBacData()]);
  const categories = [...new Set(data.faqs.map((f) => f.category))];
  const tr = T[lang];

  return (
    <>
      <PageHero overline={tr.overline} title={tr.title} accent={tr.accent} lead={tr.lead} scene="aide" />

      <Container className="py-8 sm:py-12">
        <section
          aria-label={t.chat.title}
          className="-mx-2 flex h-[min(680px,calc(100dvh-6rem))] min-h-[460px] flex-col overflow-hidden rounded-3xl border border-line bg-raised shadow-md sm:mx-auto sm:h-[640px] sm:max-w-3xl sm:rounded-4xl xl:max-w-4xl 2xl:h-[720px]"
        >
          <header className="flex items-center gap-3 bg-vert px-4 py-3 text-on-vert sm:px-5 sm:py-4">
            <AssistantAvatar className="size-10 shrink-0 ring-2 ring-on-vert/40 sm:size-12" />
            <div className="min-w-0">
              <h2 className="t-h3">{t.chat.title}</h2>
              <p className="truncate text-sm opacity-85">{t.chat.subtitle}</p>
            </div>
          </header>
          <AssistantChat t={t.chat} lang={lang} suggestions={t.assistant.examples} className="flex-1" />
        </section>

        <h2 className="t-h1 mt-20 text-center">{tr.faq}</h2>
        <div className="mx-auto max-w-3xl xl:max-w-4xl">
          <FrenchOnlyNote lang={lang} />
        </div>
        <div className="mx-auto mt-8 max-w-3xl space-y-10 xl:max-w-4xl">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="t-overline text-mena">{cat}</h3>
              <div className="mt-3 space-y-3">
                {data.faqs
                  .filter((f) => f.category === cat)
                  .map((f) => (
                    <details
                      key={f.question}
                      className="group rounded-2xl border border-line bg-raised shadow-sm open:border-vert"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold [&::-webkit-details-marker]:hidden">
                        {f.question}
                        <ChevronDown
                          className="size-5 shrink-0 text-vert transition-transform group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <p className="px-5 pb-5 text-muted">{f.answer}</p>
                    </details>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="t-h1 mt-20 text-center">{tr.human}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">{tr.humanLead}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <School className="size-10 text-vert" aria-hidden />
            <p className="t-h3 mt-3">{tr.ecole}</p>
            <p className="mt-2 text-muted">{tr.ecoleText}</p>
          </div>
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <UserRound className="size-10 text-mena" aria-hidden />
            <p className="t-h3 mt-3">{tr.libre}</p>
            <p className="mt-2 text-muted">{tr.libreText}</p>
          </div>
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-sm">
            <Building2 className="size-10 text-info" aria-hidden />
            <p className="t-h3 mt-3">{tr.offices}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {UNIVERSITIES.map((u) => (
                <li key={u} className="rounded-full bg-sunken px-3 py-1 text-sm font-semibold">
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}
