import { DataStore } from "./store";

// ----------------------------------------------------------------------------
// Importiert die mitgelieferten Lehrlinge + Ausbildungsplan 2026/2027 beim
// allerersten App-Start, sofern noch keine Lehrlinge im System sind.
// Bereits vorhandene Daten werden NIEMALS überschrieben.
//
// Der Import von seedData.ts erfolgt dynamisch, damit die Seed-Daten nicht
// ins Haupt-JS-Bundle eingebacken werden, sondern nur beim tatsächlich
// nötigen Erstimport nachgeladen werden.
// ----------------------------------------------------------------------------

export async function seedInitialData(): Promise<void> {
  const existingLehrlinge = DataStore.getLehrlinge();
  if (existingLehrlinge.length > 0) return; // Bereits Daten vorhanden -> nichts tun

  const { SEED_LEHRLINGE, SEED_PLAN_DATA } = await import("./seedData");

  // WICHTIG: syncToServer=false! Dieser Seed ist nur ein lokaler Offline-
  // Fallback. Er darf NIEMALS automatisch zur Datenbank hochgeladen werden -
  // sonst würde ein Gerät ohne lokalen Cache (Browser-Daten gelöscht, neuer
  // Browser, ...) beim Start versehentlich die alte Ausgangs-Version über
  // echte, neuere Serverdaten schreiben, bevor überhaupt geprüft wurde, was
  // auf dem Server steht. Der direkt danach folgende loadFromSupabase()-
  // Aufruf überschreibt diese lokalen Platzhalterdaten ohnehin mit dem
  // echten Serverstand, falls vorhanden.
  DataStore.setLehrlinge(SEED_LEHRLINGE, false);
  DataStore.setPlanData(SEED_PLAN_DATA, false);
  DataStore.setLastUpload({
    date: new Date().toISOString(),
    fileName: "Lehrlingsplan_2026_2027.html (Erstimport)",
  });
}
