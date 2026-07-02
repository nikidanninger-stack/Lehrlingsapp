import { useEffect, useMemo, useRef, useState } from "react";
import type { Lehrling, PlanEntry, PlanEntryType } from "../types";
import { planTypeLabels } from "./ui/TypeBadge";
import { parseDate } from "../utils/dateUtils";
import { getHolidayName } from "../data/holidays";

const DAY_WIDTH = 10;
const ROW_HEIGHT = 32;
const LABEL_WIDTH = 220;

export const planTypeBarColors: Record<PlanEntryType, string> = {
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
};

interface TooltipState {
  x: number;
  y: number;
  title: string;
  subtitle: string;
}

interface AusbildungsplanMatrixProps {
  lehrlinge: Lehrling[];
  planData: PlanEntry[];
  highlightPersonalnummer?: string;
}

function getAusbildungsjahrRange(): { start: Date; end: Date } {
  return {
    start: new Date(2026, 8, 1),
    end: new Date(2027, 7, 31),
  };
}

function daysBetweenInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function fmt(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

function dayInfo(date: Date): { isWeekend: boolean; holidayName: string | null } {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const holidayName = getHolidayName(fmt(date));
  return { isWeekend, holidayName };
}

export function AusbildungsplanMatrix({
  lehrlinge,
  planData,
  highlightPersonalnummer,
}: AusbildungsplanMatrixProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end } = useMemo(() => getAusbildungsjahrRange(), []);
  const days = useMemo(() => daysBetweenInclusive(start, end), [start, end]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const lehrjahrGruppen = useMemo(() => {
    const groups: Record<number, Lehrling[]> = { 1: [], 2: [], 3: [], 4: [] };
    lehrlinge.forEach((l) => {
      if (!groups[l.lehrjahr]) groups[l.lehrjahr] = [];
      groups[l.lehrjahr].push(l);
    });
    Object.values(groups).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [lehrlinge]);

  const planByPersonalnummer = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    planData.forEach((entry) => {
      const list = map.get(entry.personalnummer) ?? [];
      list.push(entry);
      map.set(entry.personalnummer, list);
    });
    return map;
  }, [planData]);

  const dayInfos = useMemo(() => days.map(dayInfo), [days]);

  const monthMarkers = useMemo(() => {
    const markers: { index: number; label: string }[] = [];
    days.forEach((d, idx) => {
      if (d.getDate() === 1) {
        markers.push({
          index: idx,
          label: d.toLocaleDateString("de-AT", { month: "short", year: "2-digit" }),
        });
      }
    });
    return markers;
  }, [days]);

  const totalWidth = days.length * DAY_WIDTH;

  function scrollToToday() {
    const todayIdx = days.findIndex((d) => fmt(d) === fmt(new Date()));
    if (todayIdx >= 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_WIDTH - 200);
    }
  }

  useEffect(() => {
    scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showEntryTooltip(e: React.MouseEvent, entry: PlanEntry) {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      title: entry.details,
      subtitle: `${entry.startDate} – ${entry.endDate} · ${entry.location}`,
    });
  }

  function showDayTooltip(e: React.MouseEvent, date: Date, holidayName: string) {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      title: holidayName,
      subtitle: fmt(date),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          {fmt(start)} – {fmt(end)} · {lehrlinge.length} Lehrlinge
        </p>
        <button
          onClick={scrollToToday}
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          Zu heute springen
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white relative">
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <p className="font-semibold">{tooltip.title}</p>
            <p className="text-gray-300">{tooltip.subtitle}</p>
          </div>
        )}
        <div
          ref={scrollRef}
          onMouseLeave={() => setTooltip(null)}
          className="overflow-x-auto overflow-y-auto max-h-[70vh] scroll-thin"
        >
          <div style={{ width: LABEL_WIDTH + totalWidth, minWidth: "100%" }}>
            <div
              className="sticky top-0 z-20 flex bg-gray-50 border-b border-gray-200"
              style={{ height: 28 }}
            >
              <div
                className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 shrink-0"
                style={{ width: LABEL_WIDTH }}
              />
              <div className="relative" style={{ width: totalWidth }}>
                {monthMarkers.map((m) => (
                  <div
                    key={m.index}
                    className="absolute top-0 h-full flex items-center text-[10px] font-semibold text-gray-500 border-l border-gray-300 pl-1"
                    style={{ left: m.index * DAY_WIDTH }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="sticky z-20 flex bg-gray-50 border-b border-gray-200 text-[8px] text-gray-400"
              style={{ top: 28, height: 16 }}
            >
              <div
                className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 shrink-0"
                style={{ width: LABEL_WIDTH }}
              />
              {days.map((d, idx) => {
                const isToday = fmt(d) === fmt(new Date());
                const { isWeekend, holidayName } = dayInfos[idx];
                return (
                  <div
                    key={idx}
                    onMouseEnter={
                      holidayName ? (e) => showDayTooltip(e, d, holidayName) : undefined
                    }
                    className={`flex items-center justify-center shrink-0 ${
                      isToday
                        ? "bg-blue-100 font-bold text-blue-700"
                        : holidayName
                          ? "bg-red-100"
                          : isWeekend
                            ? "bg-gray-200"
                            : ""
                    }`}
                    style={{ width: DAY_WIDTH }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {[1, 2, 3, 4].map((lj) => {
              const gruppe = lehrjahrGruppen[lj] ?? [];
              if (gruppe.length === 0) return null;
              return (
                <div key={lj}>
                  <div
                    className="sticky left-0 z-10 bg-blue-50 border-b border-blue-100 px-3 flex items-center text-xs font-bold text-blue-800"
                    style={{ height: 24, width: LABEL_WIDTH + totalWidth }}
                  >
                    {lj}. Lehrjahr ({gruppe.length})
                  </div>
                  {gruppe.map((lehrling) => {
                    const entries = planByPersonalnummer.get(lehrling.personalnummer) ?? [];
                    const isHighlighted = highlightPersonalnummer === lehrling.personalnummer;
                    return (
                      <div
                        key={lehrling.personalnummer}
                        className={`flex border-b border-gray-100 ${
                          isHighlighted ? "bg-blue-50" : ""
                        }`}
                        style={{ height: ROW_HEIGHT }}
                      >
                        <div
                          className={`sticky left-0 z-10 flex items-center gap-2 px-3 border-r border-gray-200 shrink-0 ${
                            isHighlighted ? "bg-blue-50" : "bg-white"
                          }`}
                          style={{ width: LABEL_WIDTH }}
                        >
                          <span className="text-[10px] text-gray-400 font-mono w-10 shrink-0">
                            {lehrling.personalnummer}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              isHighlighted ? "font-bold text-blue-800" : "text-gray-700"
                            }`}
                            title={lehrling.name}
                          >
                            {lehrling.name}
                          </span>
                        </div>
                        <div className="relative" style={{ width: totalWidth }}>
                          {days.map((d, idx) => {
                            const { isWeekend, holidayName } = dayInfos[idx];
                            if (!isWeekend && !holidayName) return null;
                            return (
                              <div
                                key={idx}
                                onMouseEnter={
                                  holidayName
                                    ? (e) => showDayTooltip(e, d, holidayName)
                                    : undefined
                                }
                                className={`absolute top-0 h-full ${
                                  holidayName ? "bg-red-50" : "bg-gray-50"
                                }`}
                                style={{ left: idx * DAY_WIDTH, width: DAY_WIDTH }}
                              />
                            );
                          })}
                          {entries.map((entry) => {
                            const entryStart = parseDate(entry.startDate);
                            const entryEnd = parseDate(entry.endDate) ?? entryStart;
                            if (!entryStart || !entryEnd) return null;
                            const startIdx = days.findIndex((d) => fmt(d) === fmt(entryStart));
                            const endIdx = days.findIndex((d) => fmt(d) === fmt(entryEnd));
                            if (startIdx < 0 || endIdx < 0) return null;
                            const left = startIdx * DAY_WIDTH;
                            const width = (endIdx - startIdx + 1) * DAY_WIDTH;
                            return (
                              <div
                                key={entry.id}
                                onMouseEnter={(e) => showEntryTooltip(e, entry)}
                                className="absolute top-1 rounded-sm opacity-90 hover:opacity-100 hover:ring-2 hover:ring-blue-400 transition-all cursor-default"
                                style={{
                                  left,
                                  width: Math.max(width - 1, 2),
                                  height: ROW_HEIGHT - 8,
                                  backgroundColor: planTypeBarColors[entry.type],
                                  zIndex: 1,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        {(Object.keys(planTypeLabels) as PlanEntryType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: planTypeBarColors[type] }}
            />
            {planTypeLabels[type]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
          Wochenende
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-100" />
          Feiertag
        </span>
      </div>
    </div>
  );
}
