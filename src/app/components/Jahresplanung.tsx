import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { PlanEntryType } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { planTypeLabels } from "./ui/TypeBadge";
import { parseDate } from "../utils/dateUtils";

const MONTHS = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

// Übersetzt Tailwind bg/text-Klassen (für Badges) in eine solide Hintergrundfarbe
// für die Gantt-Balken, da die Badge-Klassen mit /100-Opazität zu blass wären.
const barColors: Record<PlanEntryType, string> = {
  grundlagen: "bg-green-500",
  berufsschule: "bg-blue-500",
  "berufsschule-kaelte": "bg-blue-500",
  "berufsschule-elektro": "bg-indigo-500",
  service: "bg-orange-500",
  "montage-kt-et-linz": "bg-red-500",
  "montage-kt-et-wien": "bg-red-500",
  schulung: "bg-purple-500",
  "berufsschule-vorbereitung": "bg-yellow-500",
  werkzeugpruefung: "bg-gray-500",
  testlabor: "bg-cyan-500",
  betriebsurlaub: "bg-emerald-500",
  lehrlingsausflug: "bg-pink-500",
  "werkstatt-st-martin": "bg-amber-700",
};

export function Jahresplanung() {
  const [, setTick] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">("alle");
  const [typeFilter, setTypeFilter] = useState<PlanEntryType | "alle">("alle");
  const [standortFilter, setStandortFilter] = useState<string>("alle");

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const lehrlinge = DataStore.getLehrlinge();
  const alleEntries = DataStore.getPlanData();

  const standorte = useMemo(
    () => Array.from(new Set(alleEntries.map((e) => e.location).filter(Boolean))).sort(),
    [alleEntries],
  );

  const gefiltert = useMemo(() => {
    return alleEntries.filter((e) => {
      const start = parseDate(e.startDate);
      if (!start || start.getFullYear() !== year) return false;
      if (lehrjahrFilter !== "alle" && e.lehrjahr !== lehrjahrFilter) return false;
      if (typeFilter !== "alle" && e.type !== typeFilter) return false;
      if (standortFilter !== "alle" && e.location !== standortFilter) return false;
      return true;
    });
  }, [alleEntries, year, lehrjahrFilter, typeFilter, standortFilter]);

  const lehrlingeInView = useMemo(() => {
    const relevantIds = new Set(gefiltert.map((e) => e.personalnummer));
    return lehrlinge
      .filter((l) => relevantIds.has(l.personalnummer))
      .sort((a, b) => a.lehrjahr - b.lehrjahr || a.name.localeCompare(b.name));
  }, [lehrlinge, gefiltert]);

  function dayOfYearFraction(dateStr: string): number {
    const date = parseDate(dateStr);
    if (!date) return 0;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const totalDays = (end.getTime() - start.getTime()) / 86400000;
    const dayOffset = (date.getTime() - start.getTime()) / 86400000;
    return Math.max(0, Math.min(100, (dayOffset / totalDays) * 100));
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<BarChart3 size={22} />}
          title="Jahresplanung"
          subtitle={`Ganzjährige Übersicht aller Planeinträge – ${year}`}
        />
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
              >
                ‹
              </button>
              <span className="text-sm font-semibold w-14 text-center">{year}</span>
              <button
                onClick={() => setYear((y) => y + 1)}
                className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
              >
                ›
              </button>
            </div>

            <select
              value={lehrjahrFilter}
              onChange={(e) =>
                setLehrjahrFilter(e.target.value === "alle" ? "alle" : Number(e.target.value))
              }
              className="input w-auto"
            >
              <option value="alle">Alle Lehrjahre</option>
              {[1, 2, 3, 4].map((j) => (
                <option key={j} value={j}>
                  Lehrjahr {j}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PlanEntryType | "alle")}
              className="input w-auto"
            >
              <option value="alle">Alle Typen</option>
              {Object.entries(planTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={standortFilter}
              onChange={(e) => setStandortFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="alle">Alle Standorte</option>
              {standorte.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Monats-Achse */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-12 gap-px bg-gray-100 rounded-t-lg overflow-hidden text-xs text-gray-500 font-medium">
                {MONTHS.map((m) => (
                  <div key={m} className="bg-gray-50 py-1.5 text-center">
                    {m}
                  </div>
                ))}
              </div>

              {/* Zeilen pro Lehrling */}
              <div className="divide-y divide-gray-100 border border-t-0 border-gray-100 rounded-b-lg">
                {lehrlingeInView.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">
                    Keine Einträge für diese Auswahl.
                  </p>
                ) : (
                  lehrlingeInView.map((l) => {
                    const entries = gefiltert.filter(
                      (e) => e.personalnummer === l.personalnummer,
                    );
                    return (
                      <div key={l.personalnummer} className="relative h-9 flex items-center">
                        <div className="absolute left-0 -top-4 text-[11px] text-gray-400 px-1 bg-white/80 rounded z-10 hidden">
                          {l.name}
                        </div>
                        <div className="w-full h-full relative">
                          {entries.map((entry) => {
                            const left = dayOfYearFraction(entry.startDate);
                            const right = dayOfYearFraction(entry.endDate || entry.startDate);
                            const width = Math.max(right - left, 0.6);
                            return (
                              <div
                                key={entry.id}
                                title={`${l.name}: ${entry.details} (${entry.startDate} – ${entry.endDate})`}
                                className={`absolute top-1.5 h-6 rounded-md ${barColors[entry.type]} opacity-80 hover:opacity-100 transition-opacity`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {lehrlingeInView.length > 0 && (
            <div className="text-xs text-gray-400">
              {lehrlingeInView.length} Lehrling(e) in dieser Ansicht · Balken zeigen Zeiträume,
              Hover für Details.
            </div>
          )}

          {/* Legende */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            {Object.entries(planTypeLabels).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${barColors[type as PlanEntryType]}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
