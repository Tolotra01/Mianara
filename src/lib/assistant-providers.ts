import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Fournisseurs d'IA de l'assistant. Chacun renvoie un flux de morceaux de
 * texte ; une erreur levée avant le premier morceau fait basculer la route sur
 * la réponse de secours (FAQ).
 */

export type Turn = { role: "user" | "assistant"; content: string };
export type Provider = "gemini" | "claude" | "faq";

/** `ASSISTANT_PROVIDER` force un choix ; sinon, le premier fournisseur dont la clé est renseignée. */
export function pickProvider(): Provider {
  const forced = process.env.ASSISTANT_PROVIDER?.trim().toLowerCase();
  if (forced === "gemini" || forced === "claude" || forced === "faq") return forced;
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "claude";
  return "faq";
}

/* ---------- Google Gemini (offre gratuite, API REST en streaming SSE) ---------- */

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

export async function* streamGemini(
  system: string,
  messages: Turn[],
  refusal: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY est vide.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      }),
      signal,
    },
  );
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(`Gemini ${res.status} ${body?.error?.message ?? res.statusText}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let wrote = false;
  let blocked = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!data) continue;
      const chunk = JSON.parse(data) as GeminiChunk;
      if (chunk.promptFeedback?.blockReason) blocked = true;
      const candidate = chunk.candidates?.[0];
      for (const part of candidate?.content?.parts ?? []) {
        if (part.text && !part.thought) {
          wrote = true;
          yield part.text;
        }
      }
      if (candidate?.finishReason && BLOCKED.has(candidate.finishReason)) blocked = true;
    }
  }
  if (blocked) yield wrote ? `\n\n${refusal}` : refusal;
  else if (!wrote) throw new Error("Gemini : réponse vide.");
}

const BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

type GeminiChunk = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
};

/* ---------- Claude (API Anthropic, payante) ---------- */

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";

/**
 * Les clés de l'API ne sont pas toujours rattachées à un espace de travail.
 * Dans ce cas, l'API exige l'en-tête `anthropic-workspace-id`, que le SDK
 * n'envoie que pour l'authentification OAuth : on l'ajoute donc nous-mêmes
 * dès que la variable est renseignée.
 */
const WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
let client: Anthropic | null = null;

export async function* streamClaude(
  system: string,
  messages: Turn[],
  refusal: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  client ??= new Anthropic({
    defaultHeaders: WORKSPACE_ID ? { "anthropic-workspace-id": WORKSPACE_ID } : undefined,
  });
  const stream = client.beta.messages.stream(
    {
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      // Si le modèle décline une requête, l'API la relance sur le modèle de repli recommandé.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Conversation courte : un effort bas suffit et garde des réponses rapides.
      output_config: { effort: "low" },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    },
    { signal },
  );

  let wrote = false;
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      wrote = true;
      yield event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") yield wrote ? `\n\n${refusal}` : refusal;
}
