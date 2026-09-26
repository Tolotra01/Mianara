import { z } from "zod";
import { answerFromFaq } from "@/lib/assistant-faq";
import { buildSystemPrompt } from "@/lib/assistant-prompt";
import { pickProvider, streamClaude, streamGemini } from "@/lib/assistant-providers";
import { getBacData, getNews } from "@/lib/data";

const Body = z.object({
  lang: z.enum(["fr", "mg"]).default("fr"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((m) => m.at(-1)?.role === "user", "Le dernier message doit venir de l'élève."),
});

const MESSAGES = {
  fr: {
    invalid: "Question invalide.",
    tooMany: "Beaucoup de questions d'un coup ! Réessaie dans quelques minutes.",
    refusal:
      "Je ne peux pas répondre à cette question. Pour toute aide, adressez-vous à l'Office du Bac de votre université.",
  },
  mg: {
    invalid: "Tsy mety ny fanontaniana.",
    tooMany: "Be loatra ny fanontaniana ! Andramo indray afaka minitra vitsy.",
    refusal:
      "Tsy afaka mamaly an'io fanontaniana io aho. Manatona ny Office du Bac eo amin'ny oniversitenao raha mila fanampiana.",
  },
};

/* Limite de débit simple, en mémoire (par instance) : 20 questions / 10 min / IP. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS;
}

const HEADERS = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const lang = parsed.success ? parsed.data.lang : "fr";
  const m = MESSAGES[lang];

  if (!parsed.success) return Response.json({ error: m.invalid }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: m.tooMany }, { status: 429 });

  const { messages } = parsed.data;
  const [data, news] = await Promise.all([getBacData(), getNews(8)]);
  const provider = pickProvider();

  // Réponse de secours : les fiches du site, sans IA.
  const faq = (reason?: string) => {
    let text = answerFromFaq(messages.at(-1)!.content, data, lang);
    // En développement, on signale pourquoi l'IA n'a pas répondu (sans secret).
    if (reason && process.env.NODE_ENV !== "production") text += `\n\n(dev) IA indisponible : ${reason}`;
    return new Response(text, { headers: { ...HEADERS, "x-assistant-source": "faq" } });
  };

  if (provider === "faq") return faq();

  const controller = new AbortController();
  const generate = provider === "gemini" ? streamGemini : streamClaude;
  const chunks = generate(buildSystemPrompt(data, news), messages, m.refusal, controller.signal);

  // On attend le premier morceau : si le fournisseur échoue (clé, quota, panne),
  // l'élève reçoit la réponse de secours au lieu d'une erreur.
  let first: IteratorResult<string>;
  try {
    first = await chunks.next();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`Assistant (${provider}) → secours FAQ :`, reason);
    return faq(reason);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(stream) {
      try {
        for (let r = first; !r.done; r = await chunks.next()) stream.enqueue(encoder.encode(r.value));
        stream.close();
      } catch (err) {
        console.error(`Assistant (${provider}) :`, err);
        stream.error(err);
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(body, { headers: { ...HEADERS, "x-assistant-source": provider } });
}
