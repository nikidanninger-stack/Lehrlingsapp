import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// Supabase Client (Singleton)
//
// Trage deine Projektdaten in eine `.env`-Datei im Projekt-Root ein:
//
//   VITE_SUPABASE_URL=https://DEIN-PROJECT-ID.supabase.co
//   VITE_SUPABASE_ANON_KEY=DEIN-ANON-KEY
//
// Solange keine Werte gesetzt sind, läuft die App im Offline-Modus:
// alle Lese-/Schreibzugriffe passieren nur in LocalStorage, und
// Supabase-Aufrufe schlagen still fehl (siehe api/client.ts).
// ----------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

// Edge Function Basis-URL (make-server-38b12848), falls benötigt
export const edgeFunctionsBaseUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/make-server-38b12848`
  : null;

// Storage Bucket-Namen (müssen im Supabase Dashboard manuell angelegt werden)
export const STORAGE_BUCKETS = {
  lernappVideos: "lernapp-videos",
  werkzeugFotos: "werkzeug-fotos",
} as const;
