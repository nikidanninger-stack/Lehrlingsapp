import type { PlanEntry } from "../types";
import { reclassifyPlanEntry } from "./planClassifier";
import { isWeekend } from "./holidays";
import type { ExcelParseResult } from "./excelParser";

// ----------------------------------------------------------------------------
// csvParser: Liest eine CSV-Datei mit demselben Spaltenformat wie der
// Excel-Import ein. Unterstützt Komma und Semikolon als Trennzeichen.
// ----------------------------------------------------------------------------

function detectDelimiter(sample: string): string {
  const commaCount = (sample.match(/,/g) ?? []).length;
  const semicolonCount = (sample.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  // Einfacher CSV-Parser mit Unterstützung für Anführungszeichen
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((v) => v.replace(/^"|"$/g, ""));
}

export async function parseCsvFile(file: File): Promise<ExcelParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return { entries: [], errors: ["Datei ist leer."], skippedWeekendCount: 0, totalRows: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => splitCsvLine(line, delimiter));

  const errors: string[] = [];
  const entries: PlanEntry[] = [];
  let skippedWeekendCount = 0;

  const startRowIdx = isNaN(Number(rows[0][0])) && rows[0][0] !== "" ? 1 : 0;

  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => cell === "")) continue;

    const personalnummer = row[0] ?? "";
    const lehrlingName = row[1] ?? "";
    const lehrjahrRaw = row[2] ?? "";
    const weekRaw = row[3] ?? "";
    const startDate = row[4] ?? "";
    const endDate = row[5] ?? "";
    const location = row[6] ?? "";
    const details = row[8] ?? row[7] ?? "";

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

    entries.push({
      id: `${personalnummer}-${startDate}-${i}`,
      personalnummer,
      lehrlingName,
      lehrjahr,
      week: Number.isNaN(week) ? undefined : week,
      startDate,
      endDate: endDate || startDate,
      location,
      type: reclassifyPlanEntry({ details, location }),
      details,
    });
  }

  return {
    entries,
    errors,
    skippedWeekendCount,
    totalRows: rows.length - startRowIdx,
  };
}
