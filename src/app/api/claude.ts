import type { ChatMessage } from "../types";

// ----------------------------------------------------------------------------
// Direkter Client-seitiger Aufruf der Anthropic Claude API.
//
// WICHTIG: Der API-Key wird vom Admin im Admin-Panel eingegeben und in
// LocalStorage + Supabase KV-Store gespeichert (siehe DataStore.saveChatbotApiKey).
// Ein reiner Client-seitiger Aufruf der Anthropic-API erfordert den Header
// 'anthropic-dangerous-direct-browser-access: true', da die API sonst
// CORS-Anfragen von Browsern ablehnt. Für produktiven Einsatz sollte dieser
// Aufruf stattdessen über eine Supabase Edge Function proxied werden, damit
// der Schlüssel nie im Browser landet – das ist im "make-server"-Backend
// vorgesehen (siehe Projekt-Spezifikation).
// ----------------------------------------------------------------------------

const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";
const MAX_HISTORY = 20;

export interface ClaudeCallOptions {
  apiKey: string;
  systemPrompt: string;
  history: ChatMessage[];
  userMessage: string;
}

export async function callClaude({
  apiKey,
  systemPrompt,
  history,
  userMessage,
}: ClaudeCallOptions): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Kein Claude API-Key hinterlegt. Bitte im Admin-Panel unter 'Chatbot' konfigurieren.",
    );
  }

  const recentHistory = history.slice(-MAX_HISTORY);
  const messages = [
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Claude API-Fehler (${response.status}). ${errBody.slice(0, 200)}`,
    );
  }

  const data = await response.json();
  const textBlock = (data.content ?? []).find(
    (block: { type: string; text?: string }) => block.type === "text",
  );
  return textBlock?.text ?? "Keine Antwort erhalten.";
}
