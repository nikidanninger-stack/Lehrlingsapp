import type { PlanEntry } from "../types";
import { reclassifyPlanEntry } from "./planClassifier";
import { isWeekend } from "./holidays";

// ----------------------------------------------------------------------------
// excelParser: Liest eine .xlsx-Datei mit dem Ausbildungsplan ein.
//
// Erwartetes Spaltenformat (siehe Spezifikation):
//   A: Personalnummer
//   B: Name des Lehrlings
//   C: Lehrjahr (1-4)
//   D: Kalenderwoche
//   E: Start-Datum (DD.MM.YYYY)
//   F: End-Datum (DD.MM.YYYY)
//   G: Standort/Location
//   H: Typ (wird automatisch über reclassifyPlanEntry erkannt/überschrieben)
//   I: Details/Beschreibung
//
// Wochenende-Einträge werden automatisch herausgefiltert.
// ----------------------------------------------------------------------------

export interface ExcelParseResult {
  entries: PlanEntry[];
  errors: string[];
  skippedWeekendCount: number;
  totalRows: number;
}

function excelDateToString(value: unknown, XLSX: typeof import("xlsx")): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") {
    // Excel-Serial-Datum → JS Date (Excel-Epoch: 1899-12-30)
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    const dd = String(date.d).padStart(2, "0");
    const mm = String(date.m).padStart(2, "0");
    return `${dd}.${mm}.${date.y}`;
  }
  return "";
}

function cellToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const errors: string[] = [];
  const entries: PlanEntry[] = [];
  let skippedWeekendCount = 0;

  // Erste Zeile überspringen, falls es eine Kopfzeile ist (heuristisch: Spalte A ist keine Zahl)
  const startRowIdx =
    rows.length > 0 && isNaN(Number(rows[0][0])) && cellToString(rows[0][0]) !== ""
      ? 1
      : 0;

  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => cellToString(cell) === "")) continue;

    const personalnummer = cellToString(row[0]);
    const lehrlingName = cellToString(row[1]);
    const lehrjahrRaw = cellToString(row[2]);
    const weekRaw = cellToString(row[3]);
    const startDate = excelDateToString(row[4], XLSX);
    const endDate = excelDateToString(row[5], XLSX);
    const location = cellToString(row[6]);
    const details = cellToString(row[8] ?? row[7] ?? "");

    if (!personalnummer || !startDate) {
      errors.push(`Zeile ${i + 1}: Personalnummer oder Startdatum fehlt – übersprungen.`);
      continue;
    }

    if (isWeekend(startDate)) {
      skippedWeekendCount++;
      continue;
    }

    const lehrjahr = parseInt(lehrjahrRaw, 10);
    if (!lehrjahr || lehrjahr < 1 || lehrjahr > 4) {
      errors.push(`Zeile ${i + 1}: Ungültiges Lehrjahr "${lehrjahrRaw}" – übersprungen.`);
      continue;
    }

    const week = weekRaw ? parseInt(weekRaw, 10) : undefined;

    const baseEntry = {
      details,
      location,
    };

    const entry: PlanEntry = {
      id: `${personalnummer}-${startDate}-${i}`,
      personalnummer,
      lehrlingName,
      lehrjahr,
      week: Number.isNaN(week) ? undefined : week,
      startDate,
      endDate: endDate || startDate,
      location,
      type: reclassifyPlanEntry(baseEntry),
      details,
    };

    entries.push(entry);
  }

  return {
    entries,
    errors,
    skippedWeekendCount,
    totalRows: rows.length - startRowIdx,
  };
}
