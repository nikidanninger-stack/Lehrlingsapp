import { supabase, edgeFunctionsBaseUrl, isSupabaseConfigured } from "../lib/supabase";
import type {
  Lehrling,
  PlanEntry,
  LernAbschnitt,
  ChatMessage,
  Ansprechpartner,
  Werkzeug,
  LeitfadenEintrag,
} from "../types";

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

// ---- Generisches Tabellen-Update (nicht mehr aktiv genutzt) ---------------

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

// ----------------------------------------------------------------------------
// Direkte Tabellen-Reads/Writes via Supabase-Client (kein Umweg über Edge
// Functions). Das ist die eigentliche, dauerhafte Datenquelle: Sobald ein
// Admin einmal importiert, sehen ALLE Geräte automatisch dieselben Daten,
// ohne dass jedes Gerät erneut importieren muss.
// ----------------------------------------------------------------------------

// Generischer Helfer: komplette Tabelle ersetzen (löschen + neu einfügen)
async function replaceTable(
  table: string,
  idColumn: string,
  rows: Record<string, unknown>[],
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .neq(idColumn, "__none__");
    if (deleteError) throw deleteError;

    if (rows.length === 0) return true;

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error: insertError } = await supabase.from(table).insert(chunk);
      if (insertError) throw insertError;
    }
    return true;
  } catch (err) {
    console.warn(`[api] replaceTable(${table}) fehlgeschlagen`, err);
    return false;
  }
}

// ---- Lehrlinge -------------------------------------------------------

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

export async function syncLehrlingeDirect(
  lehrlinge: Lehrling[],
): Promise<boolean> {
  return replaceTable(
    "lehrlinge",
    "personalnummer",
    lehrlinge as unknown as Record<string, unknown>[],
  );
}

// ---- PlanEntries -------------------------------------------------------

function planEntryToRow(entry: PlanEntry): Record<string, unknown> {
  return {
    id: String(entry.id),
    personalnummer: entry.personalnummer,
    lehrling_name: entry.lehrlingName,
    lehrjahr: entry.lehrjahr,
    start_date: entry.startDate,
    end_date: entry.endDate,
    location: entry.location,
    type: entry.type,
    details: entry.details,
  };
}

function rowToPlanEntry(row: Record<string, any>): PlanEntry {
  return {
    id: row.id,
    personalnummer: row.personalnummer,
    lehrlingName: row.lehrling_name,
    lehrjahr: row.lehrjahr,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location ?? "",
    type: row.type,
    details: row.details ?? "",
  };
}

export async function fetchPlanDataDirect(): Promise<PlanEntry[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("plan_entries").select("*");
    if (error) throw error;
    return (data ?? []).map(rowToPlanEntry);
  } catch (err) {
    console.warn("[api] fetchPlanDataDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncPlanDataDirect(
  entries: PlanEntry[],
): Promise<boolean> {
  return replaceTable("plan_entries", "id", entries.map(planEntryToRow));
}

// ---- Ansprechpartner -------------------------------------------------------

function ansprechpartnerToRow(p: Ansprechpartner): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    abteilung: p.abteilung,
    phone: p.phone,
    email: p.email,
    responsibilities: p.responsibilities ?? [],
    photo: p.photo ?? null,
  };
}

function rowToAnsprechpartner(row: Record<string, any>): Ansprechpartner {
  return {
    id: row.id,
    name: row.name,
    position: row.position ?? "",
    abteilung: row.abteilung ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    responsibilities: row.responsibilities ?? [],
    photo: row.photo ?? undefined,
  };
}

export async function fetchAnsprechpartnerDirect(): Promise<
  Ansprechpartner[] | null
> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("ansprechpartner").select("*");
    if (error) throw error;
    return (data ?? []).map(rowToAnsprechpartner);
  } catch (err) {
    console.warn("[api] fetchAnsprechpartnerDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncAnsprechpartnerDirect(
  list: Ansprechpartner[],
): Promise<boolean> {
  return replaceTable("ansprechpartner", "id", list.map(ansprechpartnerToRow));
}

// ---- Werkzeuge -------------------------------------------------------

function werkzeugToRow(w: Werkzeug): Record<string, unknown> {
  return {
    id: w.id,
    name: w.name,
    kategorie: w.kategorie,
    beschreibung: w.beschreibung,
    lehrjahre: w.lehrjahre ?? [],
    bild_url: w.bildUrl ?? null,
    wichtig: w.wichtig ?? false,
  };
}

function rowToWerkzeug(row: Record<string, any>): Werkzeug {
  return {
    id: row.id,
    name: row.name,
    kategorie: row.kategorie ?? "",
    beschreibung: row.beschreibung ?? "",
    lehrjahre: row.lehrjahre ?? [],
    bildUrl: row.bild_url ?? undefined,
    wichtig: row.wichtig ?? false,
  };
}

export async function fetchWerkzeugeDirect(): Promise<Werkzeug[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("werkzeuge").select("*");
    if (error) throw error;
    return (data ?? []).map(rowToWerkzeug);
  } catch (err) {
    console.warn("[api] fetchWerkzeugeDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncWerkzeugeDirect(list: Werkzeug[]): Promise<boolean> {
  return replaceTable("werkzeuge", "id", list.map(werkzeugToRow));
}

// ---- Leitfaden -------------------------------------------------------

function leitfadenToRow(e: LeitfadenEintrag): Record<string, unknown> {
  return {
    id: e.id,
    titel: e.titel,
    kategorie: e.kategorie,
    inhalt: e.inhalt,
    lehrjahre: e.lehrjahre ?? [],
    wichtig: e.wichtig ?? false,
    sortierung: e.sortierung ?? 0,
  };
}

function rowToLeitfaden(row: Record<string, any>): LeitfadenEintrag {
  return {
    id: row.id,
    titel: row.titel,
    kategorie: row.kategorie ?? "",
    inhalt: row.inhalt ?? "",
    lehrjahre: row.lehrjahre ?? [],
    wichtig: row.wichtig ?? false,
    sortierung: row.sortierung ?? 0,
  };
}

export async function fetchLeitfadenDirect(): Promise<
  LeitfadenEintrag[] | null
> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("leitfaden_eintraege")
      .select("*");
    if (error) throw error;
    return (data ?? []).map(rowToLeitfaden);
  } catch (err) {
    console.warn("[api] fetchLeitfadenDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncLeitfadenDirect(
  list: LeitfadenEintrag[],
): Promise<boolean> {
  return replaceTable("leitfaden_eintraege", "id", list.map(leitfadenToRow));
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
