import type { PlanEntryType } from "../../types";
import { DataStore } from "../../data/store";

// ----------------------------------------------------------------------------
// Labels und Farben für alle PlanEntryType-Werte. Die Original-Kategorien aus
// dem Planungstool nutzen deren Original-Hex-Farben (1:1 übernommen), die
// ursprünglichen App-Kategorien behalten ihre bisherigen Pastellfarben.
// ----------------------------------------------------------------------------

export const planTypeLabels: Record<PlanEntryType, string> = {
  // Ursprüngliche App-Kategorien (für manuell angelegte Termine/Einträge)
  grundlagen: "Grundlagen",
  berufsschule: "Berufsschule",
  "berufsschule-kaelte": "Berufsschule KT",
  "berufsschule-elektro": "Berufsschule ET",
  service: "Service",
  "montage-kt-et-linz": "Montage Linz",
  "montage-kt-et-wien": "Montage Wien / St. Pölten",
  schulung: "Schulungen",
  "berufsschule-vorbereitung": "BS-Vorbereitung",
  werkzeugpruefung: "Werkzeugprüfung",
  testlabor: "Testlabor",
  betriebsurlaub: "Betriebsurlaub",
  lehrlingsausflug: "Ausflug",
  "werkstatt-st-martin": "KT St. Martin",
  // Original-Kategorien aus dem Planungstool (Bezeichnungen 1:1 übernommen)
  "konstrukteur-st-martin": "Konstrukteur St. Martin",
  "elektriker-st-martin": "Elektriker St. Martin",
  "verbundbau-kt": "Verbundbau KT",
  "lehre-deutschland": "Lehre Deutschland",
  "lager-magazin-linz": "Lager / Magazin Linz",
  "testlabor-3lj": "Testlabor 3. LJ",
  "testlabor-4lj": "Testlabor 4. LJ",
  "lap-vorbereitung-kt": "LAP-Vorbereitung KT",
  "lap-vorbereitung-et": "LAP-Vorbereitung ET",
  "wifi-elektrotechnik": "WIFI Elektrotechnik",
  "bs-vorbereitung": "BS-Vorbereitung",
  projektwoche: "Projektwoche",
  kennenlerntage: "Kennenlerntage",
  "mathe-vorbereitung": "Mathe Vorbereitung",
  "mat-disposition": "Mat.Disposition",
  "service-invoicing": "Service Invoicing",
  accounting: "Accounting",
  finalization: "Finalization",
  einkauf: "Einkauf",
  "onboarding-sekretariat": "Onboarding (Sekretariat)",
  "service-billing": "Service Billing",
  "berufschule-bueromann": "Berufschule Bürokauffrau",
  marketing: "Marketing",
  "technische-zeichnerin": "Technische Zeichnerin",
  feiertag: "Feiertag",
};

// Original-Hex-Farben aus dem Planungstool (wo vorhanden), sonst sinnvolle Pastelltöne
export const planTypeHexColors: Record<PlanEntryType, string> = {
  grundlagen: "#4CAF50",
  berufsschule: "#3d6d8f",
  "berufsschule-kaelte": "#3d6d8f",
  "berufsschule-elektro": "#00B0F0",
  service: "#FF6600",
  "montage-kt-et-linz": "#66FFFF",
  "montage-kt-et-wien": "#0099FF",
  schulung: "#FF6699",
  "berufsschule-vorbereitung": "#B3E5FC",
  werkzeugpruefung: "#C00000",
  testlabor: "#FFFF99",
  betriebsurlaub: "#9E9E9E",
  lehrlingsausflug: "#CE93D8",
  "werkstatt-st-martin": "#F8CBAD",
  "konstrukteur-st-martin": "#00B050",
  "elektriker-st-martin": "#AEAAAA",
  "verbundbau-kt": "#FFBF3F",
  "lehre-deutschland": "#FF7043",
  "lager-magazin-linz": "#FFCCCC",
  "testlabor-3lj": "#FFFFCC",
  "testlabor-4lj": "#FFFF99",
  "lap-vorbereitung-kt": "#FFFF00",
  "lap-vorbereitung-et": "#FF9900",
  "wifi-elektrotechnik": "#CCFF99",
  "bs-vorbereitung": "#B3E5FC",
  projektwoche: "#CE93D8",
  kennenlerntage: "#ff69b4",
  "mathe-vorbereitung": "#0b1bf4",
  "mat-disposition": "#761c82",
  "service-invoicing": "#6b75ff",
  accounting: "#6bffee",
  finalization: "#6bff7c",
  einkauf: "#ee7c7c",
  "onboarding-sekretariat": "#fdff6b",
  "service-billing": "#a3d34a",
  "berufschule-bueromann": "#e00673",
  marketing: "#b1ddd5",
  "technische-zeichnerin": "#ab590d",
  feiertag: "#E53935",
};

// Für Fließtext-Kontrast: helle Hintergrundfarben brauchen dunklen Text, dunkle Farben hellen Text
function getContrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#ffffff";
}

// ----------------------------------------------------------------------------
// Zusammengeführte Kategorien: eingebaute Standard-Kategorien + alles, was der
// Admin selbst über die Werkzeugleiste im Lehrlingsplan angelegt oder in der
// Farbe geändert hat (DataStore.getKategorien()). Eigene Einträge haben
// Vorrang, damit z.B. eine geänderte Farbe für "Feiertag" auch wirklich
// überall greift. Diese Funktionen live (nicht als Konstante) aufrufen, damit
// neu angelegte Kategorien sofort berücksichtigt werden.
export function getMergedLabels(): Record<string, string> {
  const custom = DataStore.getKategorien();
  const merged: Record<string, string> = { ...planTypeLabels };
  custom.forEach((k) => {
    merged[k.key] = k.label;
  });
  return merged;
}

export function getMergedColors(): Record<string, string> {
  const custom = DataStore.getKategorien();
  const merged: Record<string, string> = { ...planTypeHexColors };
  custom.forEach((k) => {
    merged[k.key] = k.farbe;
  });
  return merged;
}

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const colors = getMergedColors();
  const labels = getMergedLabels();
  const hex = colors[type] ?? "#9CA3AF";
  const textColor = getContrastTextColor(hex);
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap border border-black/5 ${className}`}
      style={{ backgroundColor: hex, color: textColor }}
    >
      {labels[type] ?? type}
    </span>
  );
}
