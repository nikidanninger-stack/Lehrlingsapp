import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  LayoutGrid,
  List,
} from "lucide-react";
import type { PlanEntry, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { TypeBadge } from "./ui/TypeBadge";
import { Button } from "./ui/Button";
import { formatDate, formatDateShort, getMondayOfWeek, parseDate } from "../utils/dateUtils";

interface LehrlingsplanProps {
  user: User;
}

// Montage-Einträge werden laut Spezifikation NICHT im Lehrlingsplan angezeigt
function shouldShowEntry(entry: PlanEntry): boolean {
  return entry.type !== "montage-kt-et-linz" && entry.type !== "montage-kt-et-wien";
}

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export function Lehrlingsplan({ user }: LehrlingsplanProps) {
  const [, setTick] = useState(0);
  const [viewMode, setViewMode] = useState<"woche" | "monat">("woche");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">(
    user.role === "admin" ? "alle" : user.lehrjahr,
  );

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";

  const relevantEntries = useMemo(() => {
    const all = DataStore.getPlanData().filter(shouldShowEntry);
    if (isAdmin) {
      if (lehrjahrFilter === "alle") return all;
      return all.filter((e) => e.lehrjahr === lehrjahrFilter);
    }
    return all.filter((e) => e.personalnummer === user.personalnummer);
  }, [isAdmin, lehrjahrFilter, user.personalnummer]);

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<CalendarDays size={22} />}
          title="Lehrlingsplan"
          subtitle={
            isAdmin
              ? "Ausbildungsplan aller Lehrlinge"
              : `Dein persönlicher Ausbildungsplan – Lehrjahr ${user.lehrjahr}`
          }
          actions={
            <div className="flex bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode("woche")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "woche" ? "bg-white text-blue-700" : "text-white"
                }`}
                aria-label="Wochenansicht"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode("monat")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "monat" ? "bg-white text-blue-700" : "text-white"
                }`}
                aria-label="Monatsansicht"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          }
        />
        <div className="p-6 space-y-6">
          {/* Lehrjahr-Filter (nur Admin) */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {(["alle", 1, 2, 3, 4] as const).map((jahr) => (
                <button
                  key={jahr}
                  onClick={() => setLehrjahrFilter(jahr)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    lehrjahrFilter === jahr
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {jahr === "alle" ? "Alle Lehrjahre" : `Lehrjahr ${jahr}`}
                </button>
              ))}
            </div>
          )}

          {viewMode === "woche" ? (
            <WeekView
              entries={relevantEntries}
              anchorDate={anchorDate}
              onAnchorChange={setAnchorDate}
              showLehrlingName={isAdmin}
            />
          ) : (
            <MonthView
              entries={relevantEntries}
              anchorDate={anchorDate}
              onAnchorChange={setAnchorDate}
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Wochenansicht
// ============================================================================

function WeekView({
  entries,
  anchorDate,
  onAnchorChange,
  showLehrlingName,
}: {
  entries: PlanEntry[];
  anchorDate: Date;
  onAnchorChange: (date: Date) => void;
  showLehrlingName: boolean;
}) {
  const monday = getMondayOfWeek(anchorDate);
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const entriesByDay = weekDays.map((day) => {
    return {
      day,
      label: WOCHENTAGE[day.getDay() === 0 ? 6 : day.getDay() - 1],
      entries: entries.filter((e) => {
        const start = parseDate(e.startDate);
        const end = parseDate(e.endDate) ?? start;
        if (!start) return false;
        return day >= start && day <= (end ?? start);
      }),
    };
  });

  function goToToday() {
    onAnchorChange(new Date());
  }

  function shiftWeek(delta: number) {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + delta * 7);
    onAnchorChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-1)}
            aria-label="Vorherige Woche"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center">
            KW {formatDate(monday).slice(0, 5)} – {formatDate(weekDays[4]).slice(0, 5)}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            aria-label="Nächste Woche"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={goToToday}>
          Heute
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {entriesByDay.map(({ day, label, entries: dayEntries }) => {
          const isToday = formatDate(day) === formatDate(new Date());
          return (
            <div
              key={label}
              className={`rounded-xl border p-3 min-h-[120px] ${
                isToday
                  ? "border-blue-300 bg-blue-50/60"
                  : "border-gray-200 bg-white/50"
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">{label}</span>
                <span className="text-xs text-gray-400">{formatDateShort(formatDate(day))}</span>
              </div>
              {dayEntries.length === 0 ? (
                <p className="text-xs text-gray-300 italic">–</p>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="space-y-1">
                      <TypeBadge type={entry.type} className="block w-fit" />
                      {showLehrlingName && (
                        <p className="text-xs font-medium text-gray-700">
                          {entry.lehrlingName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 line-clamp-2">{entry.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-6">
          Keine Einträge für diesen Zeitraum vorhanden.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Monatsansicht
// ============================================================================

function MonthView({
  entries,
  anchorDate,
  onAnchorChange,
}: {
  entries: PlanEntry[];
  anchorDate: Date;
  onAnchorChange: (date: Date) => void;
}) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Montag = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    onAnchorChange(new Date(year, month + delta, 1));
  }

  const entriesByDateStr = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    entries.forEach((entry) => {
      const start = parseDate(entry.startDate);
      const end = parseDate(entry.endDate) ?? start;
      if (!start) return;
      const cursor = new Date(start);
      while (cursor <= (end ?? start)) {
        const key = formatDate(cursor);
        map.set(key, [...(map.get(key) ?? []), entry]);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Vorheriger Monat"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center capitalize">
            {firstOfMonth.toLocaleDateString("de-AT", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Nächster Monat"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onAnchorChange(new Date())}>
          Heute
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-1">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="aspect-square" />;
          const dayEntries = entriesByDateStr.get(formatDate(date)) ?? [];
          const isToday = formatDate(date) === formatDate(new Date());
          return (
            <div
              key={idx}
              className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-start gap-0.5 ${
                isToday ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-white/40"
              }`}
              title={dayEntries.map((e) => e.details).join(", ")}
            >
              <span className="text-[11px] text-gray-500">{date.getDate()}</span>
              <div className="flex flex-wrap gap-0.5 justify-center">
                {dayEntries.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
        <CalendarClock size={14} />
        Tage mit Punkt-Markierung enthalten Ausbildungsplan-Einträge.
      </div>
    </div>
  );
}
