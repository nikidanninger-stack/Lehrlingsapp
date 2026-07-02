import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DataStore } from "../data/store";
import { parseExcelFile, type ExcelParseResult } from "../data/excelParser";
import { parseCsvFile } from "../data/csvParser";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { TypeBadge } from "./ui/TypeBadge";

export function AdminStundenzettelUpload() {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ExcelParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [lehrjahr, setLehrjahr] = useState<number>(1);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setFileName(file.name);
    try {
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const parsed = isCsv ? await parseCsvFile(file) : await parseExcelFile(file);
      setResult(parsed);
      if (parsed.entries.length === 0) {
        toast.error("Keine gültigen Zeilen gefunden. Bitte Format prüfen.");
      } else {
        toast.success(`${parsed.entries.length} Einträge erkannt.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Datei konnte nicht gelesen werden. Bitte Format prüfen.");
      setResult(null);
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function confirmImport() {
    if (!result || result.entries.length === 0) return;

    // Nur Einträge des gewählten Lehrjahrs importieren
    const relevantEntries = result.entries.filter((e) => e.lehrjahr === lehrjahr);
    if (relevantEntries.length === 0) {
      toast.error(`Keine Einträge für Lehrjahr ${lehrjahr} in dieser Datei gefunden.`);
      return;
    }

    DataStore.updatePlanDataForLehrjahr(lehrjahr, relevantEntries);
    DataStore.setLastUpload({ date: new Date().toISOString(), fileName });
    toast.success(
      `${relevantEntries.length} Einträge für Lehrjahr ${lehrjahr} importiert.`,
    );
    setResult(null);
    setFileName("");
  }

  return (
    <GlassCard>
      <SectionHeader
        icon={<FileSpreadsheet size={22} />}
        title="Excel/CSV-Import"
        subtitle="Ausbildungsplan aus Excel oder CSV importieren"
      />
      <div className="p-6 space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50/50"
          }`}
        >
          <UploadCloud
            size={36}
            className={`mx-auto mb-3 ${dragOver ? "text-blue-600" : "text-gray-400"}`}
          />
          <p className="text-sm font-medium text-gray-700">
            Datei hierher ziehen oder klicken zum Auswählen
          </p>
          <p className="text-xs text-gray-400 mt-1">.xlsx, .xls oder .csv</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileInputChange}
            className="hidden"
          />
        </div>

        {parsing && (
          <p className="text-sm text-gray-500 text-center">Datei wird gelesen…</p>
        )}

        {result && !parsing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                <CheckCircle2 size={14} /> {result.entries.length} Einträge erkannt
              </span>
              {result.skippedWeekendCount > 0 && (
                <span className="text-gray-500">
                  {result.skippedWeekendCount} Wochenend-Einträge automatisch entfernt
                </span>
              )}
              {result.errors.length > 0 && (
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  <AlertTriangle size={14} /> {result.errors.length} Warnungen
                </span>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-32 overflow-y-auto scroll-thin space-y-0.5">
                {result.errors.map((err, idx) => (
                  <p key={idx}>{err}</p>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Lehrjahr für Import auswählen
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((jahr) => {
                  const countInFile = result.entries.filter(
                    (e) => e.lehrjahr === jahr,
                  ).length;
                  return (
                    <button
                      key={jahr}
                      onClick={() => setLehrjahr(jahr)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        lehrjahr === jahr
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-transparent shadow-md shadow-blue-500/30"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      LJ {jahr} ({countInFile})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vorschau-Tabelle */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto scroll-thin">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2 font-medium">Personalnr.</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Zeitraum</th>
                      <th className="px-3 py-2 font-medium">Ort</th>
                      <th className="px-3 py-2 font-medium">Typ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.entries
                      .filter((e) => e.lehrjahr === lehrjahr)
                      .slice(0, 50)
                      .map((entry) => (
                        <tr key={entry.id} className="border-t border-gray-100">
                          <td className="px-3 py-2">{entry.personalnummer}</td>
                          <td className="px-3 py-2">{entry.lehrlingName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {entry.startDate} – {entry.endDate}
                          </td>
                          <td className="px-3 py-2">{entry.location}</td>
                          <td className="px-3 py-2">
                            <TypeBadge type={entry.type} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Button onClick={confirmImport} className="w-full">
              Import für Lehrjahr {lehrjahr} bestätigen
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
