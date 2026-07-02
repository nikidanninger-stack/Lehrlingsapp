import type { LernAbschnitt } from "../types";
import { DataStore } from "./store";

// ----------------------------------------------------------------------------
// Beim allerersten App-Start wird "Modul 0: Allgemeine Kältetechnik" als
// Startinhalt für Lehrjahr 1 angelegt, falls noch keine Abschnitte existieren.
// ----------------------------------------------------------------------------

const modul0: LernAbschnitt = {
  id: "allgemeine-kaeltetechnik",
  lehrjahr: 1,
  titel: "Allgemeine Kältetechnik – Grundlagen",
  beschreibung: "Einführung in die Grundprinzipien der Kältetechnik",
  sortierung: 0,
  inhalt: `
    <h2>Grundprinzipien der Kältetechnik</h2>
    <p>Kältetechnik beschäftigt sich mit der Erzeugung und Nutzung von Temperaturen
    unterhalb der Umgebungstemperatur. Das Grundprinzip jeder Kompressionskälteanlage
    ist der Kreislauf eines Kältemittels, das abwechselnd verdampft und kondensiert
    wird, um Wärme von einem kälteren zu einem wärmeren Ort zu transportieren.</p>

    <h3>Der Kältekreislauf</h3>
    <p>Ein klassischer Kältekreislauf besteht aus vier Hauptkomponenten:</p>
    <ul>
      <li><strong>Verdampfer</strong> – hier nimmt das Kältemittel Wärme aus der
      Umgebung auf und verdampft dabei</li>
      <li><strong>Verdichter (Kompressor)</strong> – verdichtet das gasförmige
      Kältemittel, wodurch Druck und Temperatur steigen</li>
      <li><strong>Verflüssiger (Kondensator)</strong> – hier gibt das Kältemittel
      die aufgenommene Wärme wieder ab und kondensiert</li>
      <li><strong>Expansionsventil</strong> – reduziert den Druck des flüssigen
      Kältemittels wieder auf Verdampferdruck</li>
    </ul>

    <h3>Warum das wichtig ist</h3>
    <p>Dieses Grundprinzip findest du in jeder Kälteanlage wieder – vom kleinen
    Haushaltskühlschrank bis zur industriellen Kälteanlage. Als Lehrling in der
    Kältetechnik wirst du diesen Kreislauf in den kommenden Jahren in all seinen
    Ausprägungen kennenlernen.</p>
  `,
  dateiIds: [],
  wissensabfragen: [
    {
      id: "modul0-frage-1",
      frage: "Was ist das Grundprinzip der Kälteanlage laut Video?",
      antworten: [
        "Kompression eines Gases",
        "Verdampfen eines Kältemittels",
        "Kondensation",
        "Expansion",
      ],
      richtigeAntwort: 1,
      erklaerung:
        "Das Verdampfen des Kältemittels im Verdampfer entzieht der Umgebung Wärme – das ist der eigentliche Kühleffekt.",
    },
    {
      id: "modul0-frage-2",
      frage: "Welche Komponente erhöht Druck und Temperatur des Kältemittels?",
      antworten: ["Verdampfer", "Expansionsventil", "Verdichter", "Verflüssiger"],
      richtigeAntwort: 2,
      erklaerung:
        "Der Verdichter (Kompressor) verdichtet das gasförmige Kältemittel und erhöht dabei Druck und Temperatur.",
    },
    {
      id: "modul0-frage-3",
      frage: "Wo gibt das Kältemittel die aufgenommene Wärme wieder ab?",
      antworten: ["Im Verdampfer", "Im Verflüssiger", "Im Expansionsventil", "Im Verdichter"],
      richtigeAntwort: 1,
      erklaerung:
        "Im Verflüssiger (Kondensator) kondensiert das Kältemittel und gibt dabei die zuvor aufgenommene Wärme ab.",
    },
    {
      id: "modul0-frage-4",
      frage: "Welche Aufgabe hat das Expansionsventil?",
      antworten: [
        "Es verdichtet das Kältemittel",
        "Es kühlt das Kältemittel auf Umgebungstemperatur",
        "Es reduziert den Druck des flüssigen Kältemittels",
        "Es transportiert Wärme in die Umgebung",
      ],
      richtigeAntwort: 2,
      erklaerung:
        "Das Expansionsventil reduziert den Druck des flüssigen Kältemittels wieder auf Verdampferdruck.",
    },
  ],
  erstellt: new Date().toISOString(),
  aktualisiert: new Date().toISOString(),
};

export function initializeLernabschnitte(): void {
  const existing = DataStore.getLernAbschnitte();
  if (existing.length > 0) return;
  DataStore.addLernAbschnitt(modul0);
}
