// ============================================================================
// LehrlingsApp – zentrale Datenmodelle
// ============================================================================

// Lehrling (Auszubildender)
export interface Lehrling {
  personalnummer: string; // Eindeutige ID, z.B. "12345"
  name: string; // "Max Mustermann"
  lehrjahr: number; // 1, 2, 3 oder 4
  standort?: "Wien" | "Linz" | "St. Martin";
}

// Alle bekannten Planungs-Eintragstypen.
// Enthält sowohl die ursprünglichen App-Kategorien als auch alle Kategorien
// aus dem Original-Planungstool (Lehrlingsplan_2026_2027.html), damit jede
// dort vorkommende Bezeichnung 1:1 mit eigener Farbe übernommen werden kann.
export type PlanEntryType =
  // Ursprüngliche App-Kategorien (bleiben für manuell angelegte Einträge nutzbar)
  | "grundlagen"
  | "berufsschule"
  | "berufsschule-kaelte"
  | "berufsschule-elektro"
  | "service"
  | "montage-kt-et-linz"
  | "montage-kt-et-wien"
  | "schulung"
  | "berufsschule-vorbereitung"
  | "werkzeugpruefung"
  | "testlabor"
  | "betriebsurlaub"
  | "lehrlingsausflug"
  | "werkstatt-st-martin"
  // Original-Kategorien aus dem Planungstool
  | "konstrukteur-st-martin"
  | "elektriker-st-martin"
  | "verbundbau-kt"
  | "lehre-deutschland"
  | "lager-magazin-linz"
  | "testlabor-3lj"
  | "testlabor-4lj"
  | "lap-vorbereitung-kt"
  | "lap-vorbereitung-et"
  | "wifi-elektrotechnik"
  | "bs-vorbereitung"
  | "projektwoche"
  | "kennenlerntage"
  | "mathe-vorbereitung"
  | "mat-disposition"
  | "service-invoicing"
  | "accounting"
  | "finalization"
  | "einkauf"
  | "onboarding-sekretariat"
  | "service-billing"
  | "berufschule-bueromann"
  | "marketing"
  | "technische-zeichnerin";

// Planungseintrag (Ausbildungsplan-Eintrag)
export interface PlanEntry {
  id: number | string;
  personalnummer: string;
  lehrlingName: string;
  lehrjahr: number;
  week?: number; // Kalenderwoche (optional)
  startDate: string; // Format: "DD.MM.YYYY"
  endDate: string; // Format: "DD.MM.YYYY"
  location: string; // z.B. "Wien", "Linz", "St. Martin"
  type: PlanEntryType;
  details: string; // Freitext-Beschreibung
}

// Termin
export interface Termin {
  id: number;
  title: string;
  date: string; // "DD.MM.YYYY"
  time: string; // "HH:MM"
  location: string;
  type: "berufsschule" | "schulung" | "ausflug" | "prüfung";
  description: string;
  items: string[]; // Checkliste/Mitbringliste
  lehrjahre: number[]; // Welche Lehrjahre betrifft dieser Termin? [1,2,3,4]
}

// Krankmeldung
export interface Krankmeldung {
  id: string; // UUID
  personalnummer: string;
  lehrlingName: string;
  startDate: string; // "DD.MM.YYYY"
  endDate: string; // "DD.MM.YYYY"
  hasDoctor: boolean; // War beim Arzt?
  hasCertificate: boolean; // Krankschreibung vorhanden?
  certificateDate?: string; // Datum der Krankschreibung
  notes?: string; // Freitext-Notizen
  datum: string; // ISO-Timestamp der Erstellung
}

// Ansprechpartner (Kontaktperson)
export interface Ansprechpartner {
  id: string;
  name: string;
  position: string; // z.B. "Ausbildungsleiter"
  abteilung: string; // z.B. "HR", "Technik"
  phone: string;
  email: string;
  responsibilities: string[]; // ["Ausbildungsplanung", "Prüfungsanmeldung"]
  photo?: string; // URL oder Base64
}

// Werkzeug (Werkzeugkatalog)
export interface Werkzeug {
  id: string;
  name: string;
  kategorie: string; // z.B. "Handwerkzeug", "Messtechnik"
  beschreibung: string;
  lehrjahre: number[]; // Für welche Lehrjahre relevant?
  bildUrl?: string; // Foto (Supabase Storage URL)
  wichtig: boolean; // Hervorgehoben?
}

// Leitfaden-Eintrag (Lehrlingsleitfaden)
export interface LeitfadenEintrag {
  id: string;
  titel: string;
  kategorie: string; // z.B. "Verhaltensregeln", "Arbeitssicherheit"
  inhalt: string; // HTML oder Markdown
  lehrjahre: number[];
  wichtig: boolean;
  sortierung: number;
}

// Wissensabfrage (Quiz-Frage)
export interface Wissensabfrage {
  id: string;
  frage: string;
  antworten: string[]; // 4 Antwortmöglichkeiten
  richtigeAntwort: number; // Index (0-3) der richtigen Antwort
  erklaerung?: string; // Erklärung nach der Antwort
}

// Lernabschnitt (LernApp-Kapitel)
export interface LernAbschnitt {
  id: string;
  lehrjahr: number;
  titel: string; // z.B. "Elektrische Grundlagen"
  beschreibung: string;
  sortierung: number;
  inhalt: string; // HTML-Lerninhalt
  dateiIds: string[];
  wissensabfragen: Wissensabfrage[];
  erstellt: string; // ISO-Timestamp
  aktualisiert: string;
  videoUrl?: string; // YouTube-Link ODER Supabase Storage URL
  videoPath?: string; // Supabase Storage Path (für Löschung)
  videoAngeschaut?: boolean;
}

// Lerndatei (Anhänge zu Lernabschnitten)
export interface LernDatei {
  id: string;
  abschnittId: string;
  name: string;
  url: string;
  typ: string;
}

// Lernfortschritt
export interface LernFortschritt {
  personalnummer: string;
  abschnittId: string;
  abgeschlossen: boolean;
  fortschritt: number; // 0-100%
  beantworteteFragen: {
    frageId: string;
    richtig: boolean;
    datum: string;
  }[];
  letzteAktivitaet: string;
}

// Benutzerrollen
export type UserRole = "lehrling" | "admin" | null;

export interface User {
  id: string;
  name: string;
  personalnummer: string;
  lehrjahr: number;
  role: UserRole;
}

// Chat-Nachricht (Chatbot)
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Screen-Routing (State-basiert, keine URLs)
export type Screen =
  | "dashboard"
  | "lehrlingsplan"
  | "termine"
  | "krankmeldung"
  | "ansprechpartner"
  | "leitfaden"
  | "werkzeug"
  | "profil"
  | "admin"
  | "chatbot"
  | "jahresplanung"
  | "lernapp";

// Letzter Excel/CSV Upload
export interface LastUploadInfo {
  date: string;
  fileName: string;
}
