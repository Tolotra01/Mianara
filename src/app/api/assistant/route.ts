import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/assistant-prompt";
import { getBacData, getNews } from "@/lib/data";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

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
    unavailable: "L'assistant n'est pas encore configuré sur ce serveur.",
    invalid: "Question invalide.",
    tooMany: "Beaucoup de questions d'un coup ! Réessaie dans quelques minutes.",
    failed: "L'assistant n'a pas pu répondre. Réessaie dans un instant.",
    refusal:
      "Je ne peux pas répondre à cette question. Pour toute aide, adressez-vous à l'Office du Bac de votre université.",
  },
  mg: {
    unavailable: "Mbola tsy voaomana eto amin'ity mpizara ity ny mpanampy.",
    invalid: "Tsy mety ny fanontaniana.",
    tooMany: "Be loatra ny fanontaniana ! Andramo indray afaka minitra vitsy.",
    failed: "Tsy afaka namaly ny mpanampy. Andramo indray afaka kelikely.",
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

let client: Anthropic | null = null;

function errorStatus(err: unknown): { status: number; key: "unavailable" | "tooMany" | "failed" } {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { status: 503, key: "unavailable" };
  }
  if (err instanceof Anthropic.RateLimitError) return { status: 429, key: "tooMany" };
  if (err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError)) {
    // Erreur levée par le SDK avant l'appel (identifiants absents, par exemple).
    return { status: 503, key: "unavailable" };
  }
  return { status: 502, key: "failed" };
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const lang = parsed.success ? parsed.data.lang : "fr";
  const m = MESSAGES[lang];

  if (!parsed.success) return Response.json({ error: m.invalid }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: m.tooMany }, { status: 429 });

  const [data, news] = await Promise.all([getBacData(), getNews(8)]);

  const fail = (err: unknown) => {
    const { status, key } = errorStatus(err);
    console.error("Assistant:", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    return Response.json({ error: m[key] }, { status });
  };

  let stream;
  try {
    client ??= new Anthropic();
    stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      // Si le modèle décline une requête, l'API la relance sur le modèle de repli recommandé.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Conversation courte : un effort bas suffit et garde des réponses rapides.
      output_config: { effort: "low" },
      system: [{ type: "text", text: buildSystemPrompt(data, news), cache_control: { type: "ephemeral" } }],
      messages: parsed.data.messages,
    });
  } catch (err) {
    return fail(err);
  }

  // On attend le premier événement : les erreurs d'authentification ou de quota
  // deviennent un vrai code HTTP au lieu d'un flux interrompu.
  const events = stream[Symbol.asyncIterator]();
  let first: IteratorResult<Anthropic.Beta.Messages.BetaRawMessageStreamEvent>;
  try {
    first = await events.next();
  } catch (err) {
    return fail(err);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let wrote = false;
        for (let r = first; !r.done; r = await events.next()) {
          const event = r.value;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
            wrote = true;
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(wrote ? `\n\n${m.refusal}` : m.refusal));
        }
        controller.close();
      } catch (err) {
        console.error("Assistant:", err);
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
