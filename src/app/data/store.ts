import type {
  Lehrling,
  PlanEntry,
  PlanKategorie,
  Termin,
  Krankmeldung,
  Ansprechpartner,
  Werkzeug,
  LeitfadenEintrag,
  LernAbschnitt,
  LernDatei,
  LernFortschritt,
  ChatMessage,
  LastUploadInfo,
} from "../types";
import { isWeekend, isAustrianHoliday } from "./holidays";
import {
  fetchLehrlingeDirect,
  fetchPlanDataDirect,
  syncLehrlingeDirect,
  syncPlanDataDirect,
  fetchAnsprechpartnerDirect,
  syncAnsprechpartnerDirect,
  fetchWerkzeugeDirect,
  syncWerkzeugeDirect,
  fetchLeitfadenDirect,
  syncLeitfadenDirect,
  fetchKategorienDirect,
  syncKategorienDirect,
  fetchLernabschnitteFromServer,
  saveLernabschnitteToServer,
  loadChatbotApiKey as apiLoadChatbotApiKey,
  saveChatbotApiKey as apiSaveChatbotApiKey,
  loadChatbotHistory as apiLoadChatbotHistory,
  saveChatbotHistory as apiSaveChatbotHistory,
} from "../api/client";

// ----------------------------------------------------------------------------
// LocalStorage Keys
// ----------------------------------------------------------------------------

const KEYS = {
  lehrlinge: "lehrlingsapp_lehrlinge",
  planData: "lehrlingsapp_plan_data",
  kategorien: "lehrlingsapp_kategorien",
  termine: "lehrlingsapp_termine",
  lastUpload: "lehrlingsapp_last_upload",
  backup: "lehrlingsapp_backup",
  dataLocked: "lehrlingsapp_data_locked",
  lernAbschnitte: "lehrlingsapp_lern_abschnitte",
  lernDateien: "lehrlingsapp_lern_dateien",
  lernFortschritte: "lehrlingsapp_lern_fortschritte",
  krankmeldungen: "lehrlingsapp_krankmeldungen",
  ansprechpartner: "lehrlingsapp_ansprechpartner",
  werkzeuge: "lehrlingsapp_werkzeuge",
  leitfadenEintraege: "lehrlingsapp_leitfaden_eintraege",
  initialized: "lehrlingsapp_initialized",
  chatbotApiKey: "chatbot_api_key",
  chatbotHistory: "chatbot_history",
} as const;

// ----------------------------------------------------------------------------
// Event-System (Subscriber-Pattern für reaktive UI-Updates ohne Redux/Context)
// ----------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToDataChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyDataChange(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("[DataStore] Listener-Fehler", err);
    }
  });
}

// ----------------------------------------------------------------------------
// Generische LocalStorage Helfer
// ----------------------------------------------------------------------------

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[DataStore] Lesefehler für ${key}`, err);
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[DataStore] Schreibfehler für ${key}`, err);
  }
}

// ----------------------------------------------------------------------------
// Wochenend-Filter für PlanEntry-Listen
// ----------------------------------------------------------------------------

function filterWeekendEntries(entries: PlanEntry[]): PlanEntry[] {
  return entries.filter((entry) => !isWeekend(entry.startDate));
}

// ============================================================================
// DataStore
// ============================================================================

export const DataStore = {
  // ---- Initialisierung -----------------------------------------------------

  isInitialized(): boolean {
    return localStorage.getItem(KEYS.initialized) === "true";
  },

  initialize(): void {
    if (DataStore.isInitialized()) return;
    writeJSON(KEYS.lehrlinge, []);
    writeJSON(KEYS.planData, []);
    writeJSON(KEYS.termine, []);
    writeJSON(KEYS.lernAbschnitte, []);
    writeJSON(KEYS.lernDateien, []);
    writeJSON(KEYS.lernFortschritte, []);
    writeJSON(KEYS.krankmeldungen, []);
    writeJSON(KEYS.ansprechpartner, []);
    writeJSON(KEYS.werkzeuge, []);
    writeJSON(KEYS.leitfadenEintraege, []);
    localStorage.setItem(KEYS.dataLocked, "false");
    localStorage.setItem(KEYS.initialized, "true");
  },

  // ---- Lehrlinge -------------------------------------------------------

  getLehrlinge(): Lehrling[] {
    return readJSON<Lehrling[]>(KEYS.lehrlinge, []);
  },

  // syncToServer: bei true (Standard) wird zusätzlich fire-and-forget nach
  // Supabase geschrieben. Beim reinen Laden vom Server (loadFromSupabase)
  // wird false übergeben, damit kein unnötiger Rückschreib-Zyklus entsteht.
  setLehrlinge(lehrlinge: Lehrling[], syncToServer = true): void {
    writeJSON(KEYS.lehrlinge, lehrlinge);
    notifyDataChange();
    if (syncToServer) {
      void syncLehrlingeDirect(lehrlinge);
    }
  },

  // Wie setLehrlinge, aber wartet wirklich auf die Bestätigung vom Server und
  // gibt zurück, ob es geklappt hat - für Stellen in der UI, an denen der
  // Nutzer aktiv eine Bestätigung braucht (z.B. Lehrling verschieben oder
  // umbenennen), statt eines "fire and forget", das Fehler verschluckt.
  async setLehrlingeAwaited(lehrlinge: Lehrling[]): Promise<boolean> {
    writeJSON(KEYS.lehrlinge, lehrlinge);
    notifyDataChange();
    return syncLehrlingeDirect(lehrlinge);
  },

  addLehrling(lehrling: Lehrling): void {
    const all = DataStore.getLehrlinge();
    if (all.some((l) => l.personalnummer === lehrling.personalnummer)) {
      throw new Error("Personalnummer bereits vergeben");
    }
    DataStore.setLehrlinge([...all, lehrling]);
  },

  updateLehrling(personalnummer: string, updates: Partial<Lehrling>): void {
    const all = DataStore.getLehrlinge();
    DataStore.setLehrlinge(
      all.map((l) =>
        l.personalnummer === personalnummer ? { ...l, ...updates } : l,
      ),
    );
  },

  deleteLehrling(personalnummer: string): void {
    const all = DataStore.getLehrlinge();
    DataStore.setLehrlinge(
      all.filter((l) => l.personalnummer !== personalnummer),
    );
  },

  async addLehrlingAwaited(lehrling: Lehrling): Promise<boolean> {
    const all = DataStore.getLehrlinge();
    if (all.some((l) => l.personalnummer === lehrling.personalnummer)) {
      throw new Error("Personalnummer bereits vergeben");
    }
    return DataStore.setLehrlingeAwaited([...all, lehrling]);
  },

  async updateLehrlingAwaited(personalnummer: string, updates: Partial<Lehrling>): Promise<boolean> {
    const all = DataStore.getLehrlinge();
    return DataStore.setLehrlingeAwaited(
      all.map((l) => (l.personalnummer === personalnummer ? { ...l, ...updates } : l)),
    );
  },

  async deleteLehrlingAwaited(personalnummer: string): Promise<boolean> {
    const all = DataStore.getLehrlinge();
    return DataStore.setLehrlingeAwaited(all.filter((l) => l.personalnummer !== personalnummer));
  },

  findLehrling(personalnummer: string): Lehrling | undefined {
    return DataStore.getLehrlinge().find(
      (l) => l.personalnummer === personalnummer,
    );
  },

  // ---- PlanEntries -------------------------------------------------------

  getPlanData(): PlanEntry[] {
    return filterWeekendEntries(readJSON<PlanEntry[]>(KEYS.planData, []));
  },

  setPlanData(entries: PlanEntry[], syncToServer = true): void {
    const clean = filterWeekendEntries(entries);
    writeJSON(KEYS.planData, clean);
    notifyDataChange();
    if (syncToServer) {
      void syncPlanDataDirect(clean);
    }
  },

  // Wie setPlanData, aber wartet wirklich auf die Server-Bestätigung.
  async setPlanDataAwaited(entries: PlanEntry[]): Promise<boolean> {
    const clean = filterWeekendEntries(entries);
    writeJSON(KEYS.planData, clean);
    notifyDataChange();
    return syncPlanDataDirect(clean);
  },

  updatePlanDataForLehrjahr(lehrjahr: number, entries: PlanEntry[]): void {
    const existing = DataStore.getPlanData();
    const withoutLehrjahr = existing.filter((e) => e.lehrjahr !== lehrjahr);
    const clean = filterWeekendEntries(entries);
    DataStore.setPlanData([...withoutLehrjahr, ...clean]);
  },

  getPlanDataForLehrling(personalnummer: string): PlanEntry[] {
    return DataStore.getPlanData().filter(
      (e) => e.personalnummer === personalnummer,
    );
  },

  // ---- Termine -------------------------------------------------------

  getTermine(): Termin[] {
    return readJSON<Termin[]>(KEYS.termine, []);
  },

  setTermine(termine: Termin[]): void {
    writeJSON(KEYS.termine, termine);
    notifyDataChange();
  },

  addTermin(termin: Termin): void {
    DataStore.setTermine([...DataStore.getTermine(), termin]);
  },

  updateTermin(id: number, updates: Partial<Termin>): void {
    DataStore.setTermine(
      DataStore.getTermine().map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    );
  },

  deleteTermin(id: number): void {
    DataStore.setTermine(DataStore.getTermine().filter((t) => t.id !== id));
  },

  // ---- Krankmeldungen -------------------------------------------------------

  getKrankmeldungen(): Krankmeldung[] {
    return readJSON<Krankmeldung[]>(KEYS.krankmeldungen, []);
  },

  setKrankmeldungen(meldungen: Krankmeldung[]): void {
    writeJSON(KEYS.krankmeldungen, meldungen);
    notifyDataChange();
  },

  addKrankmeldung(meldung: Krankmeldung): void {
    DataStore.setKrankmeldungen([...DataStore.getKrankmeldungen(), meldung]);
  },

  getKrankmeldungenForLehrling(personalnummer: string): Krankmeldung[] {
    return DataStore.getKrankmeldungen()
      .filter((m) => m.personalnummer === personalnummer)
      .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  },

  // ---- Ansprechpartner -------------------------------------------------------

  getAnsprechpartner(): Ansprechpartner[] {
    return readJSON<Ansprechpartner[]>(KEYS.ansprechpartner, []);
  },

  setAnsprechpartner(list: Ansprechpartner[], syncToServer = true): void {
    writeJSON(KEYS.ansprechpartner, list);
    notifyDataChange();
    if (syncToServer) {
      void syncAnsprechpartnerDirect(list);
    }
  },

  async setAnsprechpartnerAwaited(list: Ansprechpartner[]): Promise<boolean> {
    writeJSON(KEYS.ansprechpartner, list);
    notifyDataChange();
    return syncAnsprechpartnerDirect(list);
  },

  async addAnsprechpartnerAwaited(person: Ansprechpartner): Promise<boolean> {
    return DataStore.setAnsprechpartnerAwaited([...DataStore.getAnsprechpartner(), person]);
  },

  async updateAnsprechpartnerAwaited(id: string, updates: Partial<Ansprechpartner>): Promise<boolean> {
    return DataStore.setAnsprechpartnerAwaited(
      DataStore.getAnsprechpartner().map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  },

  async deleteAnsprechpartnerAwaited(id: string): Promise<boolean> {
    return DataStore.setAnsprechpartnerAwaited(
      DataStore.getAnsprechpartner().filter((p) => p.id !== id),
    );
  },

  addAnsprechpartner(person: Ansprechpartner): void {
    DataStore.setAnsprechpartner([...DataStore.getAnsprechpartner(), person]);
  },

  updateAnsprechpartner(id: string, updates: Partial<Ansprechpartner>): void {
    DataStore.setAnsprechpartner(
      DataStore.getAnsprechpartner().map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    );
  },

  deleteAnsprechpartner(id: string): void {
    DataStore.setAnsprechpartner(
      DataStore.getAnsprechpartner().filter((p) => p.id !== id),
    );
  },

  // ---- Werkzeuge -------------------------------------------------------

  getWerkzeuge(): Werkzeug[] {
    return readJSON<Werkzeug[]>(KEYS.werkzeuge, []);
  },

  setWerkzeuge(list: Werkzeug[], syncToServer = true): void {
    writeJSON(KEYS.werkzeuge, list);
    notifyDataChange();
    if (syncToServer) {
      void syncWerkzeugeDirect(list);
    }
  },

  addWerkzeug(werkzeug: Werkzeug): void {
    DataStore.setWerkzeuge([...DataStore.getWerkzeuge(), werkzeug]);
  },

  updateWerkzeug(id: string, updates: Partial<Werkzeug>): void {
    DataStore.setWerkzeuge(
      DataStore.getWerkzeuge().map((w) =>
        w.id === id ? { ...w, ...updates } : w,
      ),
    );
  },

  deleteWerkzeug(id: string): void {
    DataStore.setWerkzeuge(DataStore.getWerkzeuge().filter((w) => w.id !== id));
  },

  // ---- Leitfaden -------------------------------------------------------

  getLeitfadenEintraege(): LeitfadenEintrag[] {
    return readJSON<LeitfadenEintrag[]>(KEYS.leitfadenEintraege, []).sort(
      (a, b) => a.sortierung - b.sortierung,
    );
  },

  setLeitfadenEintraege(list: LeitfadenEintrag[], syncToServer = true): void {
    writeJSON(KEYS.leitfadenEintraege, list);
    notifyDataChange();
    if (syncToServer) {
      void syncLeitfadenDirect(list);
    }
  },

  async setLeitfadenEintraegeAwaited(list: LeitfadenEintrag[]): Promise<boolean> {
    writeJSON(KEYS.leitfadenEintraege, list);
    notifyDataChange();
    return syncLeitfadenDirect(list);
  },

  async addLeitfadenEintragAwaited(eintrag: LeitfadenEintrag): Promise<boolean> {
    return DataStore.setLeitfadenEintraegeAwaited([...DataStore.getLeitfadenEintraege(), eintrag]);
  },

  async updateLeitfadenEintragAwaited(id: string, updates: Partial<LeitfadenEintrag>): Promise<boolean> {
    return DataStore.setLeitfadenEintraegeAwaited(
      DataStore.getLeitfadenEintraege().map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
  },

  async deleteLeitfadenEintragAwaited(id: string): Promise<boolean> {
    return DataStore.setLeitfadenEintraegeAwaited(
      DataStore.getLeitfadenEintraege().filter((e) => e.id !== id),
    );
  },

  addLeitfadenEintrag(eintrag: LeitfadenEintrag): void {
    DataStore.setLeitfadenEintraege([
      ...DataStore.getLeitfadenEintraege(),
      eintrag,
    ]);
  },

  updateLeitfadenEintrag(id: string, updates: Partial<LeitfadenEintrag>): void {
    DataStore.setLeitfadenEintraege(
      DataStore.getLeitfadenEintraege().map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    );
  },

  deleteLeitfadenEintrag(id: string): void {
    DataStore.setLeitfadenEintraege(
      DataStore.getLeitfadenEintraege().filter((e) => e.id !== id),
    );
  },

  // ---- LernAbschnitte -------------------------------------------------------

  getLernAbschnitte(): LernAbschnitt[] {
    return readJSON<LernAbschnitt[]>(KEYS.lernAbschnitte, []).sort(
      (a, b) => a.sortierung - b.sortierung,
    );
  },

  setLernAbschnitte(list: LernAbschnitt[]): void {
    writeJSON(KEYS.lernAbschnitte, list);
    notifyDataChange();
    void saveLernabschnitteToServer(list);
  },

  addLernAbschnitt(abschnitt: LernAbschnitt): void {
    DataStore.setLernAbschnitte([...DataStore.getLernAbschnitte(), abschnitt]);
  },

  updateLernAbschnitt(id: string, updates: Partial<LernAbschnitt>): void {
    DataStore.setLernAbschnitte(
      DataStore.getLernAbschnitte().map((a) =>
        a.id === id
          ? { ...a, ...updates, aktualisiert: new Date().toISOString() }
          : a,
      ),
    );
  },

  deleteLernAbschnitt(id: string): void {
    DataStore.setLernAbschnitte(
      DataStore.getLernAbschnitte().filter((a) => a.id !== id),
    );
  },

  // ---- LernDateien -------------------------------------------------------

  getLernDateien(): LernDatei[] {
    return readJSON<LernDatei[]>(KEYS.lernDateien, []);
  },

  setLernDateien(list: LernDatei[]): void {
    writeJSON(KEYS.lernDateien, list);
    notifyDataChange();
  },

  // ---- LernFortschritte -------------------------------------------------------

  getLernFortschritte(): LernFortschritt[] {
    return readJSON<LernFortschritt[]>(KEYS.lernFortschritte, []);
  },

  setLernFortschritte(list: LernFortschritt[]): void {
    writeJSON(KEYS.lernFortschritte, list);
    notifyDataChange();
  },

  getLernFortschrittFor(
    personalnummer: string,
    abschnittId: string,
  ): LernFortschritt | undefined {
    return DataStore.getLernFortschritte().find(
      (f) => f.personalnummer === personalnummer && f.abschnittId === abschnittId,
    );
  },

  upsertLernFortschritt(fortschritt: LernFortschritt): void {
    const all = DataStore.getLernFortschritte();
    const idx = all.findIndex(
      (f) =>
        f.personalnummer === fortschritt.personalnummer &&
        f.abschnittId === fortschritt.abschnittId,
    );
    if (idx >= 0) {
      const copy = [...all];
      copy[idx] = fortschritt;
      DataStore.setLernFortschritte(copy);
    } else {
      DataStore.setLernFortschritte([...all, fortschritt]);
    }
  },

  // Gesamtfortschritt (%) eines Lehrlings über alle Abschnitte seines Lehrjahrs
  getGesamtfortschritt(personalnummer: string, lehrjahr: number): number {
    const abschnitte = DataStore.getLernAbschnitte().filter(
      (a) => a.lehrjahr === lehrjahr,
    );
    if (abschnitte.length === 0) return 0;
    const fortschritte = DataStore.getLernFortschritte().filter(
      (f) => f.personalnummer === personalnummer,
    );
    const sum = abschnitte.reduce((acc, abschnitt) => {
      const f = fortschritte.find((x) => x.abschnittId === abschnitt.id);
      return acc + (f?.fortschritt ?? 0);
    }, 0);
    return Math.round(sum / abschnitte.length);
  },

  // ---- Letzter Upload -------------------------------------------------------

  getLastUpload(): LastUploadInfo | null {
    return readJSON<LastUploadInfo | null>(KEYS.lastUpload, null);
  },

  setLastUpload(info: LastUploadInfo): void {
    writeJSON(KEYS.lastUpload, info);
    notifyDataChange();
  },

  // ---- Data-Lock (Admin: Daten sperren) -------------------------------------

  isDataLocked(): boolean {
    return localStorage.getItem(KEYS.dataLocked) === "true";
  },

  setDataLocked(locked: boolean): void {
    localStorage.setItem(KEYS.dataLocked, String(locked));
    notifyDataChange();
  },

  // ---- Backup -------------------------------------------------------

  createBackup(): void {
    const backup = {
      timestamp: new Date().toISOString(),
      lehrlinge: DataStore.getLehrlinge(),
      planData: DataStore.getPlanData(),
      termine: DataStore.getTermine(),
      krankmeldungen: DataStore.getKrankmeldungen(),
      ansprechpartner: DataStore.getAnsprechpartner(),
      werkzeuge: DataStore.getWerkzeuge(),
      leitfadenEintraege: DataStore.getLeitfadenEintraege(),
      lernAbschnitte: DataStore.getLernAbschnitte(),
      lernFortschritte: DataStore.getLernFortschritte(),
    };
    writeJSON(KEYS.backup, backup);
  },

  getBackup(): Record<string, unknown> | null {
    return readJSON<Record<string, unknown> | null>(KEYS.backup, null);
  },

  // ---- Cache leeren -------------------------------------------------------

  clearLocalCache(): void {
    Object.values(KEYS).forEach((key) => {
      if (key === KEYS.backup) return; // Backup bleibt erhalten
      localStorage.removeItem(key);
    });
    DataStore.initialize();
  },

  // ---- Wochenende bereinigen (lokal + Supabase) -------------------------------------------------------

  cleanupWochenendeLocal(): number {
    const before = readJSON<PlanEntry[]>(KEYS.planData, []);
    const after = filterWeekendEntries(before);
    writeJSON(KEYS.planData, after);
    notifyDataChange();
    return before.length - after.length;
  },

  async cleanupWochenende(): Promise<void> {
    DataStore.cleanupWochenendeLocal();
  },

  // Korrigiert Einträge, die durch fehlerhaft übernommene Daten aus dem
  // ursprünglichen Excel/HTML-Planungstool auf falschen Tagen als "Feiertag"
  // markiert sind (die beweglichen Feiertage - Ostermontag, Christi
  // Himmelfahrt, Pfingstmontag, Fronleichnam - wurden dort teils falsch
  // berechnet). Entfernt:
  //  a) "feiertag"-Einträge an Tagen, die KEIN echter österreichischer
  //     Feiertag sind (z.B. fälschlich markierte Werktage)
  //  b) alle anderen Einträge, die an einem ECHTEN Feiertag liegen (damit
  //     die automatische Feiertags-Einfärbung sichtbar wird, statt von
  //     einer Werktags-Farbe überdeckt zu werden)
  // Funktioniert für alle Jahre, nicht nur für ein bestimmtes.
  correctHolidaysLocal(): { removedWrongFeiertag: number; removedWorkOnHoliday: number } {
    const entries = readJSON<PlanEntry[]>(KEYS.planData, []);
    let removedWrongFeiertag = 0;
    let removedWorkOnHoliday = 0;

    const cleaned = entries.filter((e) => {
      const isRealHoliday = isAustrianHoliday(e.startDate);
      if (e.type === "feiertag" && !isRealHoliday) {
        removedWrongFeiertag++;
        return false;
      }
      if (e.type !== "feiertag" && isRealHoliday) {
        removedWorkOnHoliday++;
        return false;
      }
      return true;
    });

    writeJSON(KEYS.planData, cleaned);
    notifyDataChange();
    return { removedWrongFeiertag, removedWorkOnHoliday };
  },

  async correctHolidays(): Promise<{ removedWrongFeiertag: number; removedWorkOnHoliday: number }> {
    const result = DataStore.correctHolidaysLocal();
    await syncPlanDataDirect(DataStore.getPlanData());
    return result;
  },

  // Einmaliger Import der Geburtsdaten aus der Excel-Liste "Geburtsdaten_Lehrlinge.xlsx".
  // Matcht per Name (Groß-/Kleinschreibung und Leerzeichen werden ignoriert).
  async importGeburtsdaten(): Promise<{ gesetzt: number; nichtGefunden: string[] }> {
    const GEBURTSDATEN: { name: string; geburtsdatum: string }[] = [
  { name: 'Lukas Hennerbichler', geburtsdatum: '07.06.2010' },
  { name: 'Philip Franz Svoboda', geburtsdatum: '20.03.2010' },
  { name: 'Besian Behrami', geburtsdatum: '24.09.2009' },
  { name: 'Kristian Reindl', geburtsdatum: '11.09.2009' },
  { name: 'Elias SCHWEIGER', geburtsdatum: '02.08.2009' },
  { name: 'David Ondrak', geburtsdatum: '14.04.2009' },
  { name: 'Jeremy Falkner', geburtsdatum: '26.03.2009' },
  { name: 'Lukas GUSENBAUER', geburtsdatum: '22.09.2008' },
  { name: 'Houssien Khatab', geburtsdatum: '23.08.2008' },
  { name: 'Josef HANDLBAUER', geburtsdatum: '05.08.2008' },
  { name: 'Ivan KOCIC', geburtsdatum: '24.07.2008' },
  { name: 'Jeremy SCHAFFER', geburtsdatum: '07.05.2008' },
  { name: 'Clemens PIRKER', geburtsdatum: '23.03.2008' },
  { name: 'Phillip LANDERL', geburtsdatum: '17.01.2008' },
  { name: 'David SCHWARZ', geburtsdatum: '30.12.2007' },
  { name: 'Thomas FENEBERGER', geburtsdatum: '18.05.2007' },
  { name: 'Moritz KESZLER', geburtsdatum: '10.05.2007' },
  { name: 'Chirko MOHAMAD', geburtsdatum: '16.03.2007' },
  { name: 'Jonas SCHWEIGER', geburtsdatum: '29.12.2006' },
  { name: 'Arian BEHRAMI', geburtsdatum: '17.12.2006' },
  { name: 'Leon GASSNER', geburtsdatum: '19.10.2006' },
  { name: 'Mihajlo ALEKSIC', geburtsdatum: '22.02.2006' },
  { name: 'Ahmet CALISKAN', geburtsdatum: '09.02.2006' },
  { name: 'Anna AUTENGRUBER', geburtsdatum: '17.11.2005' },
  { name: 'Mevlüt AKTAS', geburtsdatum: '15.10.2005' },
  { name: 'Leon BRANDSTÄTTER', geburtsdatum: '30.09.2005' },
  { name: 'Dario PINDUR', geburtsdatum: '02.07.2005' },
  { name: 'Lucas CSOKAY', geburtsdatum: '29.06.2005' },
  { name: 'Oliver WIMMER', geburtsdatum: '18.10.2004' },
  { name: 'Mohamed Yasin Caliskan', geburtsdatum: '05.01.2004' },
  { name: 'Idaver Jusuf MURATOV', geburtsdatum: '26.06.2002' },
    ];

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const alle = DataStore.getLehrlinge();
    const byNormalizedName = new Map(alle.map((l) => [normalize(l.name), l]));

    let gesetzt = 0;
    const nichtGefunden: string[] = [];
    const aktualisiert = [...alle];

    for (const { name, geburtsdatum } of GEBURTSDATEN) {
      const treffer = byNormalizedName.get(normalize(name));
      if (!treffer) {
        nichtGefunden.push(name);
        continue;
      }
      const idx = aktualisiert.findIndex((l) => l.personalnummer === treffer.personalnummer);
      if (idx >= 0) {
        aktualisiert[idx] = { ...aktualisiert[idx], geburtsdatum };
        gesetzt++;
      }
    }

    const ok = await DataStore.setLehrlingeAwaited(aktualisiert);
    if (!ok) {
      throw new Error("Speichern der Geburtsdaten fehlgeschlagen. Details in der Browser-Konsole.");
    }
    return { gesetzt, nichtGefunden };
  },

  // Für den manuellen "Jetzt importieren"-Button im Admin-Bereich: schreibt
  // erst lokal (schnell, für sofortiges UI-Feedback), wartet DANACH aber
  // wirklich auf den Abschluss des Uploads zur Datenbank, bevor die Funktion
  // zurückkehrt. Ohne dieses Warten könnte der Admin (oder ein versehentlich
  // zu früh geschlossener Tab / gelöschte Browserdaten) den noch laufenden
  // Upload von tausenden Einträgen mittendrin abbrechen - dann wäre trotz
  // "Erfolgreich importiert"-Meldung nie wirklich alles gespeichert worden.
  async importSeedDataAwaited(lehrlinge: Lehrling[], planData: PlanEntry[]): Promise<void> {
    DataStore.setLehrlinge(lehrlinge, false);
    DataStore.setPlanData(planData, false);
    const [okLehrlinge, okPlan] = await Promise.all([
      syncLehrlingeDirect(lehrlinge),
      syncPlanDataDirect(planData),
    ]);
    if (!okLehrlinge || !okPlan) {
      throw new Error(
        `Speichern zur Datenbank fehlgeschlagen (Lehrlinge: ${okLehrlinge ? "ok" : "FEHLER"}, Plan: ${okPlan ? "ok" : "FEHLER"}). Details in der Browser-Konsole.`,
      );
    }
  },

  async importContentSeedAwaited(
    ansprechpartner: Ansprechpartner[],
    werkzeuge: Werkzeug[],
    leitfaden: LeitfadenEintrag[],
    lernAbschnitte: LernAbschnitt[],
  ): Promise<void> {
    DataStore.setAnsprechpartner(ansprechpartner, false);
    DataStore.setWerkzeuge(werkzeuge, false);
    DataStore.setLeitfadenEintraege(leitfaden, false);
    writeJSON(KEYS.lernAbschnitte, lernAbschnitte);
    notifyDataChange();
    const [okAnsprechpartner, okWerkzeuge, okLeitfaden] = await Promise.all([
      syncAnsprechpartnerDirect(ansprechpartner),
      syncWerkzeugeDirect(werkzeuge),
      syncLeitfadenDirect(leitfaden),
      saveLernabschnitteToServer(lernAbschnitte),
    ]);
    if (!okAnsprechpartner || !okWerkzeuge || !okLeitfaden) {
      throw new Error("Speichern zur Datenbank fehlgeschlagen. Details in der Browser-Konsole.");
    }
  },

  // ---- Plan-Kategorien (selbst angelegte Aktivitäten / Farb-Änderungen) --

  getKategorien(): PlanKategorie[] {
    return readJSON<PlanKategorie[]>(KEYS.kategorien, []);
  },

  setKategorien(list: PlanKategorie[], syncToServer = true): void {
    writeJSON(KEYS.kategorien, list);
    notifyDataChange();
    if (syncToServer) {
      void syncKategorienDirect(list);
    }
  },

  async setKategorienAwaited(list: PlanKategorie[]): Promise<boolean> {
    writeJSON(KEYS.kategorien, list);
    notifyDataChange();
    return syncKategorienDirect(list);
  },

  // Legt eine neue Kategorie an ODER überschreibt (Name/Farbe) eine
  // bestehende - egal ob es vorher eine eingebaute oder selbst angelegte
  // Kategorie war. So kann der Admin sowohl neue Aktivitäten hinzufügen
  // als auch die Farbe bestehender Aktivitäten ändern.
  upsertKategorie(key: string, label: string, farbe: string): void {
    const alle = DataStore.getKategorien();
    const idx = alle.findIndex((k) => k.key === key);
    if (idx >= 0) {
      alle[idx] = { key, label, farbe };
    } else {
      alle.push({ key, label, farbe });
    }
    DataStore.setKategorien(alle);
  },

  deleteKategorie(key: string): void {
    DataStore.setKategorien(DataStore.getKategorien().filter((k) => k.key !== key));
  },

  // ---- Chatbot -------------------------------------------------------

  getChatbotApiKeyLocal(): string {
    return localStorage.getItem(KEYS.chatbotApiKey) ?? "";
  },

  saveChatbotApiKeyLocal(key: string): void {
    localStorage.setItem(KEYS.chatbotApiKey, key);
    notifyDataChange();
  },

  async saveChatbotApiKey(key: string): Promise<void> {
    DataStore.saveChatbotApiKeyLocal(key);
    await apiSaveChatbotApiKey(key);
  },

  async loadChatbotApiKeyFromSupabase(): Promise<void> {
    const remote = await apiLoadChatbotApiKey();
    if (remote) {
      DataStore.saveChatbotApiKeyLocal(remote);
    }
  },

  getChatbotHistoryLocal(): ChatMessage[] {
    return readJSON<ChatMessage[]>(KEYS.chatbotHistory, []);
  },

  saveChatbotHistoryLocal(history: ChatMessage[]): void {
    writeJSON(KEYS.chatbotHistory, history);
    notifyDataChange();
  },

  async saveChatbotHistory(history: ChatMessage[]): Promise<void> {
    DataStore.saveChatbotHistoryLocal(history);
    await apiSaveChatbotHistory(history);
  },

  async loadChatbotHistoryFromSupabase(): Promise<void> {
    const remote = await apiLoadChatbotHistory();
    if (remote) {
      DataStore.saveChatbotHistoryLocal(remote);
    }
  },

  // ---- Supabase-Sync (Laden) -------------------------------------------------------
  // WICHTIG: Hier IMMER syncToServer=false übergeben, damit ein reines Laden
  // vom Server nicht sofort wieder dieselben Daten zurückschreibt (unnötiger
  // Netzwerk-Traffic, aber auch kein Bug - nur Effizienz).

  async loadFromSupabase(): Promise<{
    lehrlinge: Lehrling[];
    planData: PlanEntry[];
  }> {
    const [
      remoteLehrlinge,
      remotePlan,
      remoteAnsprechpartner,
      remoteWerkzeuge,
      remoteLeitfaden,
      remoteKategorien,
    ] = await Promise.all([
      fetchLehrlingeDirect(),
      fetchPlanDataDirect(),
      fetchAnsprechpartnerDirect(),
      fetchWerkzeugeDirect(),
      fetchLeitfadenDirect(),
      fetchKategorienDirect(),
    ]);

    if (remoteLehrlinge && remoteLehrlinge.length > 0) {
      DataStore.setLehrlinge(remoteLehrlinge, false);
    }
    if (remotePlan && remotePlan.length > 0) {
      DataStore.setPlanData(remotePlan, false);
    }
    if (remoteAnsprechpartner && remoteAnsprechpartner.length > 0) {
      DataStore.setAnsprechpartner(remoteAnsprechpartner, false);
    }
    if (remoteWerkzeuge && remoteWerkzeuge.length > 0) {
      DataStore.setWerkzeuge(remoteWerkzeuge, false);
    }
    if (remoteLeitfaden && remoteLeitfaden.length > 0) {
      DataStore.setLeitfadenEintraege(remoteLeitfaden, false);
    }
    if (remoteKategorien && remoteKategorien.length > 0) {
      DataStore.setKategorien(remoteKategorien, false);
    }

    return {
      lehrlinge: DataStore.getLehrlinge(),
      planData: DataStore.getPlanData(),
    };
  },

  async loadLernAbschnitteFromSupabase(): Promise<void> {
    const remote = await fetchLernabschnitteFromServer();
    if (remote && remote.length > 0) {
      writeJSON(KEYS.lernAbschnitte, remote);
      notifyDataChange();
    }
  },
};

export { notifyDataChange };
export default DataStore;
