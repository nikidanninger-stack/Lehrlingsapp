import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PlanEntry } from "../types";
import { planTypeLabels } from "./ui/TypeBadge";
import { planTypeBarColors } from "./AusbildungsplanMatrix";
import { parseDate } from "../utils/dateUtils";
import { getHolidayName } from "../data/holidays";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

interface LehrlingMonatskalenderProps {
  planData: PlanEntry[];
}

function fmt(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

function findEntryForDate(entries: PlanEntry[], date: Date): PlanEntry | null {
  for (const entry of entries) {
    const start = parseDate(entry.startDate);
    const end = parseDate(entry.endDate) ?? start;
    if (!start) continue;
    if (date >= start && date <= (end ?? start)) {
      return entry;
    }
  }
  return null;
}

export function LehrlingMonatskalender({ planData }: LehrlingMonatskalenderProps) {
  const [anchor, setAnchor] = useState(() => new Date(2026, 8, 1));
  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    setAnchor(new Date(year, month + delta, 1));
    setSelectedEntry(null);
  }

  function goToToday() {
    setAnchor(new Date());
    setSelectedEntry(null);
  }

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
          <span className="text-sm font-semibold text-gray-700 min-w-[160px] text-center capitalize">
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
        <button
          onClick={goToToday}
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          Heute
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
        {WOCHENTAGE.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="aspect-square sm:aspect-[4/3]" />;

          const entry = findEntryForDate(planData, date);
          const isToday = fmt(date) === fmt(new Date());
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const holidayName = getHolidayName(fmt(date));
          const barColor = entry ? planTypeBarColors[entry.type] : undefined;

          return (
            <button
              key={idx}
              onClick={() => entry && setSelectedEntry(entry)}
              className={`aspect-square sm:aspect-[4/3] rounded-lg border p-1.5 flex flex-col items-start justify-start text-left transition-all ${
                isToday
                  ? "border-blue-400 ring-2 ring-blue-200"
                  : holidayName
                    ? "border-red-100"
                    : isWeekend
                      ? "border-gray-100"
                      : "border-gray-200"
              } ${entry ? "hover:shadow-md cursor-pointer" : "cursor-default"}`}
              style={{
                backgroundColor: holidayName
                  ? "#FEF2F2"
                  : isWeekend
                    ? "#F9FAFB"
                    : "#FFFFFF",
              }}
              title={holidayName ?? entry?.details}
            >
              <span
                className={`text-[11px] ${
                  isToday ? "font-bold text-blue-700" : "text-gray-500"
                }`}
              >
                {date.getDate()}
              </span>
              {entry && (
                <span
                  className="mt-1 w-full text-[9px] leading-tight rounded px-1 py-0.5 truncate text-white font-medium"
                  style={{ backgroundColor: barColor }}
                >
                  {planTypeLabels[entry.type]}
                </span>
              )}
              {holidayName && !entry && (
                <span className="mt-1 text-[8px] text-red-500 leading-tight truncate w-full">
                  {holidayName}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedEntry && (
        <div className="rounded-xl border border-gray-200 bg-white/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">
                {selectedEntry.startDate} – {selectedEntry.endDate}
              </p>
              <p className="font-semibold text-gray-800">{selectedEntry.details}</p>
              <p className="text-sm text-gray-500 mt-0.5">{selectedEntry.location}</p>
            </div>
            <span
              className="text-xs text-white font-medium rounded-full px-3 py-1 shrink-0"
              style={{ backgroundColor: planTypeBarColors[selectedEntry.type] }}
            >
              {planTypeLabels[selectedEntry.type]}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        {(Object.keys(planTypeLabels) as (keyof typeof planTypeLabels)[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: planTypeBarColors[type] }}
            />
            {planTypeLabels[type]}
          </span>
        ))}
      </div>
    </div>
  );
}
