import { supabase, edgeFunctionsBaseUrl, isSupabaseConfigured } from "../lib/supabase";
import type { Lehrling, PlanEntry, LernAbschnitt, ChatMessage } from "../types";

// ----------------------------------------------------------------------------
// API-Wrapper für Supabase Edge Functions (make-server-38b12848)
//
// WICHTIG: Alle Funktionen hier sind "fire-and-forget"-freundlich.
// Sie werfen niemals einen Fehler nach oben, der die UI blockiert – die App
// läuft immer primär auf LocalStorage (siehe data/store.ts) und synct nur
// asynchron im Hintergrund, wenn Supabase konfiguriert ist.
// ----------------------------------------------------------------------------

async function safeFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T | null> {
  if (!isSupabaseConfigured || !edgeFunctionsBaseUrl) return null;
  try {
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";
    const res = await fetch(`${edgeFunctionsBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        ...(options?.headers ?? {}),
      },
    });
    if (!res.ok) {
      console.warn(`[api] ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[api] ${path} fehlgeschlagen (Offline?)`, err);
    return null;
  }
}

// ---- KV-Store (Chatbot API Key, Chat-Historie, etc.) ----------------------

export async function kvSet(key: string, value: unknown): Promise<boolean> {
  const result = await safeFetch<{ success: boolean }>("/kv-set", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
  return result?.success ?? false;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const result = await safeFetch<{ value: T }>("/kv-get", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  return result?.value ?? null;
}

// ---- Lernabschnitte ---------------------------------------------------

export async function fetchLernabschnitteFromServer(): Promise<
  LernAbschnitt[] | null
> {
  const result = await safeFetch<{ abschnitte: LernAbschnitt[] }>(
    "/lernabschnitte",
  );
  return result?.abschnitte ?? null;
}

export async function saveLernabschnitteToServer(
  abschnitte: LernAbschnitt[],
): Promise<boolean> {
  const result = await safeFetch<{ success: boolean }>("/lernabschnitte", {
    method: "POST",
    body: JSON.stringify({ abschnitte }),
  });
  return result?.success ?? false;
}

// ---- Lehrjahr-Sync (Lehrlinge + PlanData → Supabase-Tabellen) --------------

export async function syncLehrjahrToServer(
  lehrjahr: number,
  lehrlinge: Lehrling[],
  planData: PlanEntry[],
): Promise<boolean> {
  const result = await safeFetch<{ success: boolean }>("/update-lehrjahr", {
    method: "POST",
    body: JSON.stringify({ lehrjahr, lehrlinge, planData }),
  });
  return result?.success ?? false;
}

// ---- Generisches Tabellen-Update ------------------------------------------

export async function updateTable(
  table: string,
  rows: Record<string, unknown>[],
): Promise<boolean> {
  const result = await safeFetch<{ success: boolean }>("/update-table", {
    method: "POST",
    body: JSON.stringify({ table, rows }),
  });
  return result?.success ?? false;
}

// ---- Direkte Tabellen-Reads via Supabase-Client (statt Edge Function) -----

export async function fetchLehrlingeDirect(): Promise<Lehrling[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("lehrlinge").select("*");
    if (error) throw error;
    return (data ?? []) as Lehrling[];
  } catch (err) {
    console.warn("[api] fetchLehrlingeDirect fehlgeschlagen", err);
    return null;
  }
}

export async function fetchPlanDataDirect(): Promise<PlanEntry[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("plan_data").select("*");
    if (error) throw error;
    return (data ?? []) as unknown as PlanEntry[];
  } catch (err) {
    console.warn("[api] fetchPlanDataDirect fehlgeschlagen", err);
    return null;
  }
}

// ---- Chatbot-Historie / API-Key Convenience-Wrapper ------------------------

export async function loadChatbotHistory(): Promise<ChatMessage[] | null> {
  return kvGet<ChatMessage[]>("chatbot_history");
}

export async function saveChatbotHistory(
  history: ChatMessage[],
): Promise<boolean> {
  return kvSet("chatbot_history", history);
}

export async function loadChatbotApiKey(): Promise<string | null> {
  return kvGet<string>("chatbot_api_key");
}

export async function saveChatbotApiKey(key: string): Promise<boolean> {
  return kvSet("chatbot_api_key", key);
}
