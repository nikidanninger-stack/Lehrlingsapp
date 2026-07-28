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
  Todo,
  TodoErledigung,
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
  fetchTodosDirect,
  syncTodosDirect,
  fetchTodoErledigungenDirect,
  syncTodoErledigungenDirect,
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
  todos: "lehrlingsapp_todos",
  todoErledigungen: "lehrlingsapp_todo_erledigungen",
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

  async setWerkzeugeAwaited(list: Werkzeug[]): Promise<boolean> {
    writeJSON(KEYS.werkzeuge, list);
    notifyDataChange();
    return syncWerkzeugeDirect(list);
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

  // Repariert die Werkzeug-Fotos: Ein früherer Import-Button hat versehentlich
  // alle Werkzeuge in der Datenbank durch eine veraltete, fotolose Liste
  // ersetzt. Die eigentlichen Fotodateien liegen aber unverändert im
  // Supabase-Storage-Bucket "werkzeug-fotos" - hier wird per Namensabgleich
  // mit der ursprünglichen mapping.json die Bild-URL wiederhergestellt, wo
  // ein passendes Foto existiert.
  async repariereWerkzeugFotos(): Promise<{ gesetzt: number; keinFotoVorhanden: string[] }> {
    const NAME_ZU_DATEI: { name: string; file: string }[] = [
  { name: 'schukostecker', file: '0774_110_010.eps_Eshop.jpg' },
  { name: 'abisolierzange', file: 'Picture8.jpg' },
  { name: 'ausbläser', file: '0539267.jpg' },
  { name: 'hilti hit auspressgerät', file: 'Picture6.jpg' },
  { name: 'biegegerät', file: 'biegegerät.jpg' },
  { name: 'bitset', file: 'Picture83.jpg' },
  { name: 'hammerbohrer', file: '0005132.jpg' },
  { name: 'bohrerkassette', file: '0005141.jpg' },
  { name: 'bördelgerät', file: 'bördeljpg.jpg' },
  { name: 'brenner', file: 'Hagelbrenner.jpg' },
  { name: 'brennergriff', file: 'Picture2.jpg' },
  { name: 'crimpzange', file: 'PZ6.jpg' },
  { name: 'crimpzange für flachstecker', file: 'Picture1.jpg' },
  { name: 'druckminderer', file: 'azetylen.jpg' },
  { name: 'eckrohrzange', file: '0005125.jpg' },
  { name: 'ersatzklingen', file: 'Picture44.jpg' },
  { name: 'faust schraubendreher', file: 'Picture41.jpg' },
  { name: 'flachmeißel', file: 'Picture43.jpg' },
  { name: 'flammschutzmatte', file: 'Picture45.jpg' },
  { name: 'doppelmaulschlüssel', file: 'Picture46.jpg' },
  { name: 'gardena-schlauch', file: 'Picture47.jpg' },
  { name: 'gripzange', file: '0703_901_180.eps_Eshop.jpg' },
  { name: 'hammer', file: '2691_375_05.eps_Eshop.jpg' },
  { name: 'handblechschere', file: 'Picture50.jpg' },
  { name: 'handdrahtbürste', file: 'Drahtbürste.jpg' },
  { name: 'handfäustel', file: 'Picture51.jpg' },
  { name: 'handnietenzange', file: 'Picture52.jpg' },
  { name: 'inspektionsspiegel', file: 'Picture86.jpg' },
  { name: 'kabelmesser', file: '0520259_.jpg' },
  { name: 'kabeleinziehgerät', file: 'Picture53.jpg' },
  { name: 'kabeleinziehstrumpf', file: 'Picture54.jpg' },
  { name: 'kabelschere kt45 weidmüller', file: 'kabelschere.jpg' },
  { name: 'kabelschneider', file: 'KT8.jpg' },
  { name: 'kerbzange', file: '0308781.jpg' },
  { name: 'klingen zu entgrater', file: 'Picture56.jpg' },
  { name: 'kombizange', file: '0005162.jpg' },
  { name: 'körner', file: 'Picture57.jpg' },
  { name: 'kraftschraubereinsatz', file: 'Kraftschraubereinsatz.jpg' },
  { name: 'lamellenkamm', file: 'Lamellenkamm.jpg' },
  { name: 'lochsäge', file: 'Picture82.jpg' },
  { name: 'lochsäge schaft', file: 'LochsägeS.jpg' },
  { name: 'farbkreide', file: 'DV005-ppic_Farbkreide_rot_0.jpg' },
  { name: 'lötschnurrautomat', file: '2692_003_2.eps_Eshop.jpg' },
  { name: 'metallsägebogen', file: '0695_552_900.eps_Eshop.jpg' },
  { name: 'pistole für pu schaum', file: '0184183.jpg' },
  { name: 'plastik-öler', file: '2697_130_012.eps_Eshop.jpg' },
  { name: 'pucksäge', file: 'GED_pic_ps_6500480.eps_Eshop.jpg' },
  { name: 'ratschensatz', file: '111111111.jpg' },
  { name: 'ratschensatz belzer', file: '1111111.jpg' },
  { name: 'reißnadel', file: '0005217.jpg' },
  { name: 'revolverzange', file: '0005235.jpg' },
  { name: 'rohrabschneider', file: '0005207.jpg' },
  { name: 'rohrschneider schneidrad', file: '0493035.jpg' },
  { name: 'rollbandmass', file: '0705_240_5_fest.eps_Eshop.jpg' },
  { name: 'rollgabelschlüssel', file: '0700_301_160.eps_Eshop.jpg' },
  { name: 'schnellentgrater', file: '0243201.jpg' },
  { name: 'schraubendreher', file: '0005171.jpg' },
  { name: 'sechskant-stiftschlüsselsatz', file: '0701_729_309.eps_Eshop.jpg' },
  { name: 'seitenschneider', file: '0703_062_160.eps_Eshop.jpg' },
  { name: 'spannungsprüfer', file: '0701_568_615.eps_Eshop.jpg' },
  { name: 'spannungsprüfer combi-check', file: '2691_975_5.eps_Eshop.jpg' },
  { name: 'nietenbohrer', file: '0636_20.eps_Eshop.jpg' },
  { name: 'spiralbohrer', file: 'Spiralbohrer.jpg' },
  { name: 'stanleymesser', file: 'Stanleymesser.jpg' },
  { name: 'stecknuss-satz', file: '61k-kSMcdaL._AC_SX569_.jpg' },
  { name: 'steckschlüssel', file: 'Steckschlüssel.jpg' },
  { name: 'stufenbohrer', file: '0297373.jpg' },
  { name: 'kegelbohrer', file: '0692_812_820.eps_Eshop.jpg' },
  { name: 'taschenlampe', file: '0005240.jpg' },
  { name: 'telefonzange', file: '0703_076_205.eps_Eshop.jpg' },
  { name: 'torax schlüsselsatz', file: '0021513.jpg' },
  { name: 'vorschlagahle', file: '2696_650_115.eps_Eshop.jpg' },
  { name: 'wasserpumpenzange cobra quick', file: '0005218.jpg' },
  { name: 'wasserwaage', file: '0005119.jpg' },
  { name: 'zange f. pg verschraubung', file: '0522525.jpg' },
  { name: 'zentrierbohrer für lochsäge', file: '0005187.jpg' },
  { name: 'tieflochmarker', file: '0623932.jpg' },
  { name: 'ersatzmienen für tieflochmarker', file: '0623934.jpg' },
  { name: 'flaschenanschluß', file: '0212008.jpg' },
  { name: 'füllschlauch', file: '0269484.jpg' },
  { name: 'hochdruck schlauch', file: '0590849.jpg' },
  { name: 'abklemmzange', file: '455773.jpg' },
  { name: 'zapfventilzange', file: 'Picture3.jüg.png' },
  { name: 'schraderventildurchgangsöffner', file: 'Durchgangsöffner.jpg' },
  { name: 'ventileinsatzentferner', file: 'ventilkernentferner.jpg' },
  { name: 'ventilkernentferner', file: '718A3708.png' },
  { name: 'sägeblatt puksäge', file: '0609_2.eps_Eshop.jpg' },
  { name: 'bit', file: '0702_331_002_.eps_Eshop123.jpg' },
  { name: 'knipex rohrabschneider', file: 'Rigidschneider.jpg' },
  { name: 'gew. stangen entgrater', file: '0702_000_001_d.eps_Eshop.jpg' },
  { name: 'steckschlüssel einsatz', file: '943024013288101X_837156680183.jpg' },
  { name: 'kälteknarre', file: 'Refco KalteRatsche R6950 NEU.png' },
  { name: 'schnellverschluss', file: '5673.jpg' },
  { name: 'setzwerkzeug', file: '9488184934430.jpg' },
  { name: 'hand ölpumpe', file: 'OPHZnaeO0RAd0gJv_600x600.jpg' },
  { name: 'verlängerung für aufnahne', file: 'milwaukee-7-16-verlaengerung-300-mm.jpg' },
  { name: 'verlängerung für aufnahme', file: '48281030-hero_1_jpg_detail_600x600.jpg' },
  { name: 'schleifvlies', file: '2671_699_992.eps_Eshop.jpg' },
  { name: 'kugelschreiber', file: '10_LT87767_N0021.jpg' },
  { name: 'bleistift', file: '0695_900_215.eps_Eshop.jpg' },
  { name: 'dauermagnetspule', file: '0021457.jpg' },
  { name: 'trennscheibe', file: '0004182.jpg' },
  { name: 'bit halter', file: '0702_812_075.eps_Eshop.jpg' },
  { name: 'schlauchklemme', file: '0541_2.eps_Eshop.jpg' },
  { name: 'brenner dichtung', file: 'MicrosoftTeams-image (13).png' },
  { name: 'kartuschenpresse', file: '0006517.png' },
  { name: 'schraubzwinge', file: '0005124.jpg' },
  { name: 'säbelsägeblatt', file: '0651269.jpg' },
  { name: 'zurrgurt 1-tlg. mit ratsche', file: '81664501.jpg' },
  { name: 'wasserpumpenzange cobra mini', file: '0005218.jpg' },
  { name: 'permanentmarker duo schwarz', file: 'Duo marker.png' },
  { name: 'serviceanschluss r744', file: '20260707_140703.jpg' },
  { name: 'dräger strömungsprüfer', file: '20260707_140814.jpg' },    ];

    const STORAGE_BASIS =
      "https://babizkwevswcwlmpyxkj.supabase.co/storage/v1/object/public/werkzeug-fotos/werkzeuge/";

    const normalize = (s: string) => s.trim().toLowerCase();
    const dateiByName = new Map(NAME_ZU_DATEI.map((m) => [normalize(m.name), m.file]));

    const alleWerkzeuge = DataStore.getWerkzeuge();
    let gesetzt = 0;
    const keinFotoVorhanden: string[] = [];

    const aktualisiert = alleWerkzeuge.map((w) => {
      const datei = dateiByName.get(normalize(w.name));
      if (datei) {
        gesetzt++;
        return { ...w, bildUrl: `${STORAGE_BASIS}${datei}` };
      }
      keinFotoVorhanden.push(w.name);
      return w;
    });

    const ok = await DataStore.setWerkzeugeAwaited(aktualisiert);
    if (!ok) {
      throw new Error("Speichern der Werkzeug-Fotos fehlgeschlagen. Details in der Browser-Konsole.");
    }
    return { gesetzt, keinFotoVorhanden };
  },

  // Legt (bzw. aktualisiert) einen Test-/Demo-Lehrling mit Personalnummer
  // 9999 an, samt einem für das GESAMTE Ausbildungsjahr (September bis
  // September) gefüllten Beispiel-Kalender und zwei Beispiel-To-Dos, damit
  // sich jemand von außen (z.B. für eine Bewerbung/Präsentation) die App mit
  // echten Daten ansehen kann, ohne die Daten eines echten Lehrlings zu
  // verwenden.
  async erstelleTestaccountAwaited(): Promise<void> {
    const TEST_PERSONALNUMMER = "9999";
    const TEST_NAME = "EAKON Team";

    const alleLehrlinge = DataStore.getLehrlinge();
    const testLehrling: Lehrling = {
      personalnummer: TEST_PERSONALNUMMER,
      name: TEST_NAME,
      lehrjahr: 2,
      standort: "Linz",
      beruf: "KT + ET",
      kommentar: "Test-/Demo-Account zum Vorzeigen der App",
      geburtsdatum: "01.01.2008",
      reihenfolge: 9999,
    };
    const neueLehrlingsliste = [
      ...alleLehrlinge.filter((l) => l.personalnummer !== TEST_PERSONALNUMMER),
      testLehrling,
    ];
    const okLehrling = await DataStore.setLehrlingeAwaited(neueLehrlingsliste);
    if (!okLehrling) {
      throw new Error("Anlegen des Test-Lehrlings fehlgeschlagen. Details in der Browser-Konsole.");
    }

    // Beispiel-Kalender: das GESAMTE Ausbildungsjahr (01.09.2026 - 31.08.2027),
    // abwechselnde Tätigkeiten im Kreislauf, damit der Plan wirklich
    // durchgehend gefüllt aussieht, nicht nur am Anfang.
    const ablauf: { typ: string; label: string }[] = [
      { typ: "grundlagen", label: "Grundlagen" },
      { typ: "berufsschule", label: "Berufsschule" },
      { typ: "montage-kt-et-linz", label: "Montage Linz" },
      { typ: "testlabor", label: "Testlabor" },
      { typ: "service", label: "Service" },
      { typ: "schulung", label: "Schulungen" },
      { typ: "konstrukteur-st-martin", label: "Konstrukteur St. Martin" },
      { typ: "montage-kt-et-wien", label: "Montage Wien / St. Pölten" },
      { typ: "werkzeugpruefung", label: "Werkzeugprüfung" },
      { typ: "lap-vorbereitung-kt", label: "LAP-Vorbereitung KT" },
    ];
    const BLOCK_LAENGE_TAGE = 5; // eine Arbeitswoche pro Tätigkeit, dann wechselt's

    const fmt = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}.${mm}.${d.getFullYear()}`;
    };

    const ausbildungsjahrEnde = new Date(2027, 7, 31); // 31. August 2027
    const neueEintraege: PlanEntry[] = [];
    let cursor = new Date(2026, 8, 1); // 1. September 2026
    let blockIndex = 0;

    while (cursor <= ausbildungsjahrEnde) {
      const block = ablauf[blockIndex % ablauf.length];
      let hinzugefuegt = 0;
      while (hinzugefuegt < BLOCK_LAENGE_TAGE && cursor <= ausbildungsjahrEnde) {
        const tag = cursor.getDay();
        if (tag !== 0 && tag !== 6) {
          const dateStr = fmt(cursor);
          neueEintraege.push({
            id: `demo-9999-${dateStr}`,
            personalnummer: TEST_PERSONALNUMMER,
            lehrlingName: TEST_NAME,
            lehrjahr: 2,
            startDate: dateStr,
            endDate: dateStr,
            location: "Linz",
            type: block.typ,
            details: block.label,
          });
          hinzugefuegt++;
        }
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
      }
      blockIndex++;
    }

    const alleEintraege = DataStore.getPlanData().filter(
      (e) => e.personalnummer !== TEST_PERSONALNUMMER,
    );
    const okPlan = await DataStore.setPlanDataAwaited([...alleEintraege, ...neueEintraege]);
    if (!okPlan) {
      throw new Error("Anlegen des Beispiel-Kalenders fehlgeschlagen. Details in der Browser-Konsole.");
    }

    // Zwei Beispiel-To-Dos für den aktuellen Monat (eines erledigt, eines offen)
    const heute = new Date();
    const monat = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}`;
    const alleTodos = DataStore.getTodos().filter((t) => !t.id.startsWith("demo-9999-todo"));
    const demoTodos: Todo[] = [
      {
        id: "demo-9999-todo-1",
        titel: "Beispiel-Aufgabe: Berichtsheft eintragen",
        beschreibung: "Beispielhafte, bereits erledigte Aufgabe zur Demonstration.",
        monat,
        lehrjahr: 2,
        erstelltAm: new Date().toISOString(),
      },
      {
        id: "demo-9999-todo-2",
        titel: "Beispiel-Aufgabe: Werkzeugkatalog durchsehen",
        beschreibung: "Beispielhafte, noch offene Aufgabe zur Demonstration.",
        monat,
        lehrjahr: 2,
        erstelltAm: new Date().toISOString(),
      },
    ];
    const okTodos = await DataStore.setTodosAwaited([...alleTodos, ...demoTodos]);
    if (!okTodos) {
      throw new Error("Anlegen der Beispiel-To-Dos fehlgeschlagen. Details in der Browser-Konsole.");
    }

    const alleErledigungen = DataStore.getTodoErledigungen().filter(
      (e) => e.id !== "demo-9999-erledigung-1",
    );
    const okErledigungen = await DataStore.setTodoErledigungenAwaited([
      ...alleErledigungen,
      {
        id: "demo-9999-erledigung-1",
        todoId: "demo-9999-todo-1",
        personalnummer: TEST_PERSONALNUMMER,
        monat,
        erledigtAm: new Date().toISOString(),
      },
    ]);
    if (!okErledigungen) {
      throw new Error("Speichern der Beispiel-Erledigung fehlgeschlagen. Details in der Browser-Konsole.");
    }
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

  // WICHTIG: Werkzeuge werden hier bewusst NICHT mehr überschrieben! Die
  // Werkzeuge in der Datenbank wurden separat mit echten Fotos befüllt
  // (über ein eigenes Upload-Skript) - die eingebaute SEED_WERKZEUGE-Liste
  // hier im Code ist ein veralteter Schnappschuss OHNE Fotos. Ein früherer
  // Aufruf dieser Funktion hat dadurch versehentlich alle echten, mit Fotos
  // versehenen Werkzeuge gelöscht und durch die fotolose Seed-Liste ersetzt.
  async importContentSeedAwaited(
    ansprechpartner: Ansprechpartner[],
    _werkzeugeNichtMehrVerwendet: Werkzeug[],
    leitfaden: LeitfadenEintrag[],
    lernAbschnitte: LernAbschnitt[],
  ): Promise<void> {
    DataStore.setAnsprechpartner(ansprechpartner, false);
    DataStore.setLeitfadenEintraege(leitfaden, false);
    writeJSON(KEYS.lernAbschnitte, lernAbschnitte);
    notifyDataChange();
    const [okAnsprechpartner, okLeitfaden] = await Promise.all([
      syncAnsprechpartnerDirect(ansprechpartner),
      syncLeitfadenDirect(leitfaden),
      saveLernabschnitteToServer(lernAbschnitte),
    ]);
    if (!okAnsprechpartner || !okLeitfaden) {
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

  // ---- To-Dos (monatliche Aufgaben für Lehrlinge) ------------------------

  getTodos(): Todo[] {
    return readJSON<Todo[]>(KEYS.todos, []);
  },

  async setTodosAwaited(list: Todo[]): Promise<boolean> {
    writeJSON(KEYS.todos, list);
    notifyDataChange();
    return syncTodosDirect(list);
  },

  async addTodoAwaited(todo: Todo): Promise<boolean> {
    return DataStore.setTodosAwaited([...DataStore.getTodos(), todo]);
  },

  async deleteTodoAwaited(id: string): Promise<boolean> {
    const okTodo = await DataStore.setTodosAwaited(DataStore.getTodos().filter((t) => t.id !== id));
    // Zugehörige Erledigungen gleich mit aufräumen
    const okErledigungen = await DataStore.setTodoErledigungenAwaited(
      DataStore.getTodoErledigungen().filter((e) => e.todoId !== id),
    );
    return okTodo && okErledigungen;
  },

  getTodoErledigungen(): TodoErledigung[] {
    return readJSON<TodoErledigung[]>(KEYS.todoErledigungen, []);
  },

  async setTodoErledigungenAwaited(list: TodoErledigung[]): Promise<boolean> {
    writeJSON(KEYS.todoErledigungen, list);
    notifyDataChange();
    return syncTodoErledigungenDirect(list);
  },

  // Hakt ein To-Do für einen Lehrling ab bzw. macht das Abhaken rückgängig
  async toggleTodoErledigtAwaited(todoId: string, personalnummer: string, monat: string): Promise<boolean> {
    const alle = DataStore.getTodoErledigungen();
    const bereitsErledigt = alle.find(
      (e) => e.todoId === todoId && e.personalnummer === personalnummer && e.monat === monat,
    );
    const neueListe = bereitsErledigt
      ? alle.filter((e) => e.id !== bereitsErledigt.id)
      : [...alle, { id: crypto.randomUUID(), todoId, personalnummer, monat, erledigtAm: new Date().toISOString() }];
    return DataStore.setTodoErledigungenAwaited(neueListe);
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
      remoteTodos,
      remoteTodoErledigungen,
    ] = await Promise.all([
      fetchLehrlingeDirect(),
      fetchPlanDataDirect(),
      fetchAnsprechpartnerDirect(),
      fetchWerkzeugeDirect(),
      fetchLeitfadenDirect(),
      fetchKategorienDirect(),
      fetchTodosDirect(),
      fetchTodoErledigungenDirect(),
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
    if (remoteTodos && remoteTodos.length > 0) {
      writeJSON(KEYS.todos, remoteTodos);
      notifyDataChange();
    }
    if (remoteTodoErledigungen && remoteTodoErledigungen.length > 0) {
      writeJSON(KEYS.todoErledigungen, remoteTodoErledigungen);
      notifyDataChange();
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
