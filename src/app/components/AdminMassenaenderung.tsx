import { useState } from "react";
import { Users2, Check } from "lucide-react";
import { toast } from "sonner";
import type { PlanEntry, PlanEntryType } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { planTypeLabels } from "./ui/TypeBadge";
import { parseDate } from "../utils/dateUtils";

// ----------------------------------------------------------------------------
// AdminMassenaenderung
//
// Setzt für eine Gruppe (Lehrjahr oder alle) und einen Zeitraum (ein Tag oder
// mehrere) einen neuen Plan-Typ. Kann bestehende Einträge in diesem Zeitraum
// ERSETZEN oder als zusätzlichen Eintrag daneben behalten.
// ----------------------------------------------------------------------------

export function AdminMassenaenderung() {
  const [lehrjahr, setLehrjahr] = useState<number | "alle">("alle");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<PlanEntryType>("mathe-vorbereitung");
  const [ersetzen, setErsetzen] = useState(true);
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate.trim() || !endDate.trim()) {
      toast.error("Bitte Start- und Enddatum angeben.");
      return;
    }
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) {
      toast.error("Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.");
      return;
    }
    if (end < start) {
      toast.error("Das Enddatum muss nach dem Startdatum liegen.");
      return;
    }

    const betroffeneLehrlinge = DataStore.getLehrlinge().filter(
      (l) => lehrjahr === "alle" || l.lehrjahr === lehrjahr,
    );

    if (betroffeneLehrlinge.length === 0) {
      toast.error("Keine Lehrlinge für diese Auswahl gefunden.");
      return;
    }

    if (
      !confirm(
        `Für ${betroffeneLehrlinge.length} Lehrling(e) im Zeitraum ${startDate} – ${endDate} auf "${planTypeLabels[type]}" setzen?${
          ersetzen ? " Bestehende Einträge in diesem Zeitraum werden ersetzt." : " Wird zusätzlich zu bestehenden Einträgen hinzugefügt."
        }`,
      )
    ) {
      return;
    }

    const betroffeneNummern = new Set(betroffeneLehrlinge.map((l) => l.personalnummer));
    const alleEntries = DataStore.getPlanData();

    let neueEntries: PlanEntry[] = alleEntries;

    if (ersetzen) {
      // Bestehende Einträge, die sich mit dem Zeitraum überschneiden, für die
      // betroffenen Lehrlinge entfernen (einfache Überschneidungsprüfung).
      neueEntries = neueEntries.filter((entry) => {
        if (!betroffeneNummern.has(entry.personalnummer)) return true;
        const entryStart = parseDate(entry.startDate);
        const entryEnd = parseDate(entry.endDate) ?? entryStart;
        if (!entryStart || !entryEnd) return true;
        const overlaps = entryStart <= end && entryEnd >= start;
        return !overlaps;
      });
    }

    const now = Date.now();
    const neueMassenEintraege: PlanEntry[] = betroffeneLehrlinge.map((l, idx) => ({
      id: `massen-${now}-${idx}`,
      personalnummer: l.personalnummer,
      lehrlingName: l.name,
      lehrjahr: l.lehrjahr,
      startDate,
      endDate,
      location: location || l.standort || "",
      type,
      details: details || planTypeLabels[type],
    }));

    DataStore.setPlanData([...neueEntries, ...neueMassenEintraege]);
    toast.success(
      `${planTypeLabels[type]} für ${betroffeneLehrlinge.length} Lehrling(e) gesetzt.`,
    );

    setStartDate("");
    setEndDate("");
    setDetails("");
  }

  return (
    <GlassCard>
      <SectionHeader
        icon={<Users2 size={22} />}
        title="Massenänderung"
        subtitle="Für eine ganze Gruppe an einem Tag oder Zeitraum einen neuen Plan-Typ setzen"
      />
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Betroffene Gruppe</label>
          <div className="flex flex-wrap gap-2">
            {(["alle", 1, 2, 3, 4] as const).map((jahr) => (
              <button
                key={jahr}
                type="button"
                onClick={() => setLehrjahr(jahr)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  lehrjahr === jahr
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {jahr === "alle" ? "Alle Lehrjahre" : `Lehrjahr ${jahr}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Von</label>
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="TT.MM.JJJJ"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bis (bei einem einzelnen Tag: gleiches Datum)
            </label>
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="TT.MM.JJJJ"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Neuer Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PlanEntryType)}
            className="input"
          >
            {Object.entries(planTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ort (optional, sonst Standort der Person)
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Linz"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Details (optional)
            </label>
            <input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Freitext-Beschreibung"
              className="input"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ersetzen}
            onChange={(e) => setErsetzen(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-blue-600"
          />
          <span className="text-sm text-gray-700">
            Bestehende Einträge im Zeitraum ersetzen (wenn nicht angehakt, wird der
            neue Eintrag zusätzlich zu bestehenden Einträgen hinzugefügt)
          </span>
        </label>

        <Button type="submit" icon={<Check size={16} />} className="w-full">
          Für Gruppe übernehmen
        </Button>
      </form>
    </GlassCard>
  );
}
