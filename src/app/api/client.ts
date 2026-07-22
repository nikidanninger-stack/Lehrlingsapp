import { supabase, edgeFunctionsBaseUrl, isSupabaseConfigured } from "../lib/supabase";
import type {
  Lehrling,
  PlanEntry,
  LernAbschnitt,
  ChatMessage,
  Ansprechpartner,
  Werkzeug,
  LeitfadenEintrag,
  PlanKategorie,
  Todo,
  TodoErledigung,
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

// Generischer Helfer: ALLE Zeilen einer Tabelle laden, nicht nur die ersten
// 1000. Supabase/PostgREST liefert bei .select("*") ohne .range() standard-
// mäßig nur maximal 1000 Zeilen pro Anfrage zurück - bei größeren Tabellen
// (z.B. plan_entries mit über 14.000 Zeilen) wurden dadurch stillschweigend
// alle weiteren Zeilen abgeschnitten, ohne dass ein Fehler sichtbar war. Das
// war die Ursache dafür, dass nach jedem frischen Laden nur ein Teil der
// Termine zu sehen war. Hier wird seitenweise nachgeladen, bis wirklich
// alles da ist.
async function fetchAllRows(table: string, columns = "*"): Promise<Record<string, any>[] | null> {
  if (!supabase) return null;
  const pageSize = 1000;
  const allRows: Record<string, any>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break; // letzte Seite erreicht
    from += pageSize;
  }

  return allRows;
}

// Generischer Helfer: komplette Tabelle ersetzen (löschen + neu einfügen)
async function replaceTable(
  table: string,
  idColumn: string,
  rows: Record<string, unknown>[],
): Promise<boolean> {
  if (!supabase) {
    console.warn(`[api] replaceTable(${table}): Supabase-Client ist nicht konfiguriert (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY fehlen) - es wurde NICHTS gespeichert.`);
    return false;
  }
  try {
    // WICHTIG: Erst die neuen Daten sicher speichern (upsert), DANACH erst
    // die nicht mehr gebrauchten alten Zeilen löschen. So bleiben bei einem
    // Fehler/Netzwerkabbruch mitten im Sync wenigstens die alten Daten
    // erhalten, statt dass die Tabelle leer zurückbleibt (delete-first war
    // hier vorher die Ursache für sporadischen Datenverlust).
    if (rows.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error: upsertError } = await supabase
          .from(table)
          .upsert(chunk, { onConflict: idColumn });
        if (upsertError) throw upsertError;
      }
    }

    const newIds = rows
      .map((r) => r[idColumn])
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (newIds.length === 0) {
      // Wirklich alles löschen (z.B. wenn der Nutzer bewusst die komplette
      // Liste geleert hat) - hier ist rows.length === 0, also gab es oben
      // nichts zu upserten, und wir dürfen jetzt sicher alles entfernen.
      const { error: deleteAllError } = await supabase
        .from(table)
        .delete()
        .neq(idColumn, "__none__");
      if (deleteAllError) throw deleteAllError;
      return true;
    }

    // WICHTIG: Nicht mit einer riesigen "NOT IN (id1,id2,id3,...)"-Anfrage
    // löschen! Bei tausenden Zeilen (z.B. plan_entries) wird die Web-Adresse
    // dafür so lang, dass die Verbindung vom Server abgebrochen wird
    // (ERR_CONNECTION_CLOSED) - dadurch ist NIE etwas gespeichert worden,
    // obwohl kein Fehler sichtbar war. Stattdessen: vorhandene IDs holen,
    // den Unterschied in JavaScript berechnen und nur die wirklich
    // gelöschten Zeilen in kleinen Häppchen entfernen (meist nur eine
    // Handvoll, nicht tausende).
    const existingRows = await fetchAllRows(table, idColumn);

    const newIdSet = new Set(newIds);
    const staleIds = (existingRows ?? [])
      .map((r: any) => r[idColumn])
      .filter((id): id is string => typeof id === "string" && !newIdSet.has(id));

    if (staleIds.length > 0) {
      const deleteChunkSize = 200;
      for (let i = 0; i < staleIds.length; i += deleteChunkSize) {
        const chunk = staleIds.slice(i, i + deleteChunkSize);
        const { error: deleteStaleError } = await supabase.from(table).delete().in(idColumn, chunk);
        if (deleteStaleError) throw deleteStaleError;
      }
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
    const data = await fetchAllRows("lehrlinge");
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
    const data = await fetchAllRows("plan_entries");
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
    const data = await fetchAllRows("ansprechpartner");
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
    const data = await fetchAllRows("werkzeuge");
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
    const data = await fetchAllRows("leitfaden_eintraege");
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

// ---- Plan-Kategorien (vom Admin selbst angelegte/umbenannte Aktivitäten) ---

function kategorieToRow(k: PlanKategorie): Record<string, unknown> {
  return { key: k.key, label: k.label, farbe: k.farbe };
}

function rowToKategorie(row: Record<string, any>): PlanKategorie {
  return { key: row.key, label: row.label ?? "", farbe: row.farbe ?? "#9E9E9E" };
}

export async function fetchKategorienDirect(): Promise<PlanKategorie[] | null> {
  if (!supabase) return null;
  try {
    const data = await fetchAllRows("plan_kategorien");
    return (data ?? []).map(rowToKategorie);
  } catch (err) {
    console.warn("[api] fetchKategorienDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncKategorienDirect(list: PlanKategorie[]): Promise<boolean> {
  return replaceTable("plan_kategorien", "key", list.map(kategorieToRow));
}

// ---- To-Dos (monatliche Aufgaben für Lehrlinge) ----------------------------

function todoToRow(t: Todo): Record<string, unknown> {
  return {
    id: t.id,
    titel: t.titel,
    beschreibung: t.beschreibung ?? "",
    monat: t.monat,
    lehrjahr: String(t.lehrjahr),
    erstelltAm: t.erstelltAm,
  };
}

function rowToTodo(row: Record<string, any>): Todo {
  return {
    id: row.id,
    titel: row.titel ?? "",
    beschreibung: row.beschreibung || undefined,
    monat: row.monat ?? "",
    lehrjahr: row.lehrjahr === "alle" ? "alle" : Number(row.lehrjahr),
    erstelltAm: row.erstelltAm ?? new Date().toISOString(),
  };
}

export async function fetchTodosDirect(): Promise<Todo[] | null> {
  if (!supabase) return null;
  try {
    const data = await fetchAllRows("todos");
    return (data ?? []).map(rowToTodo);
  } catch (err) {
    console.warn("[api] fetchTodosDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncTodosDirect(list: Todo[]): Promise<boolean> {
  return replaceTable("todos", "id", list.map(todoToRow));
}

function erledigungToRow(e: TodoErledigung): Record<string, unknown> {
  return {
    id: e.id,
    todoId: e.todoId,
    personalnummer: e.personalnummer,
    erledigtAm: e.erledigtAm,
  };
}

function rowToErledigung(row: Record<string, any>): TodoErledigung {
  return {
    id: row.id,
    todoId: row.todoId,
    personalnummer: row.personalnummer,
    erledigtAm: row.erledigtAm ?? new Date().toISOString(),
  };
}

export async function fetchTodoErledigungenDirect(): Promise<TodoErledigung[] | null> {
  if (!supabase) return null;
  try {
    const data = await fetchAllRows("todo_erledigungen");
    return (data ?? []).map(rowToErledigung);
  } catch (err) {
    console.warn("[api] fetchTodoErledigungenDirect fehlgeschlagen", err);
    return null;
  }
}

export async function syncTodoErledigungenDirect(list: TodoErledigung[]): Promise<boolean> {
  return replaceTable("todo_erledigungen", "id", list.map(erledigungToRow));
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
