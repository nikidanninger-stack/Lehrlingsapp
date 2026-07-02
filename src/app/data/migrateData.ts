import { DataStore } from "./store";

// ----------------------------------------------------------------------------
// autoMigrate: Platz für zukünftige Datenstruktur-Migrationen.
// Wird bei jedem App-Start aufgerufen; aktuell ein No-Op-Grundgerüst,
// das erweitert werden kann, sobald sich Datenmodelle ändern.
// ----------------------------------------------------------------------------

const MIGRATION_VERSION_KEY = "lehrlingsapp_migration_version";
const CURRENT_MIGRATION_VERSION = 1;

export function autoMigrate(): void {
  const stored = localStorage.getItem(MIGRATION_VERSION_KEY);
  const version = stored ? parseInt(stored, 10) : 0;

  if (version >= CURRENT_MIGRATION_VERSION) return;

  // Beispiel-Migration (v0 → v1): sicherstellen, dass alle PlanEntries
  // eine gültige `type`-Property haben; fehlt sie, auf "grundlagen" setzen.
  const planData = DataStore.getPlanData();
  const migrated = planData.map((entry) =>
    entry.type ? entry : { ...entry, type: "grundlagen" as const },
  );
  DataStore.setPlanData(migrated);

  localStorage.setItem(MIGRATION_VERSION_KEY, String(CURRENT_MIGRATION_VERSION));
}

// ----------------------------------------------------------------------------
// fixLautDokumentZuLautVideo: Textkorrektur in Lernabschnitten & Quizfragen.
// Ersetzt "laut Dokument" durch "laut Video" (Altlast aus früheren Imports).
// ----------------------------------------------------------------------------

export function fixLautDokumentZuLautVideo(): void {
  const abschnitte = DataStore.getLernAbschnitte();
  let changed = false;

  const fixed = abschnitte.map((abschnitt) => {
    let inhalt = abschnitt.inhalt;
    if (inhalt.includes("laut Dokument")) {
      inhalt = inhalt.replaceAll("laut Dokument", "laut Video");
      changed = true;
    }

    const wissensabfragen = abschnitt.wissensabfragen.map((frage) => {
      if (frage.frage.includes("laut Dokument")) {
        changed = true;
        return { ...frage, frage: frage.frage.replaceAll("laut Dokument", "laut Video") };
      }
      return frage;
    });

    return { ...abschnitt, inhalt, wissensabfragen };
  });

  if (changed) {
    DataStore.setLernAbschnitte(fixed);
  }
}
