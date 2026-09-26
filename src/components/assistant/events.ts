/** Ouvre l'assistant flottant, avec éventuellement une question à envoyer. */
export const ASK_EVENT = "mianara:ask";

export function askAssistant(question?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(ASK_EVENT, { detail: question }));
}
