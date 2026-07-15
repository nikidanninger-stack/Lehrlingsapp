import { useEffect, useMemo, useRef, useState } from "react";
import type { Lehrling, PlanEntry, PlanEntryType } from "../types";
import { planTypeLabels, planTypeHexColors } from "./ui/TypeBadge";
import { getHolidayName } from "../data/holidays";
import { DataStore } from "../data/store";

// ----------------------------------------------------------------------------
// AusbildungsplanMatrix
//
// 1:1 an das Original-Excel-artige Planungstool angelehnte Gantt-Matrix:
// dunkelblaue Header (#1A237E), Spalten Name/Beruf/Ort, JEDER TAG ist eine
// eigenständige, einzeln klickbare quadratische Zelle (kein zusammenhängender
// Balken mehr). Ein Farbpaletten-Werkzeug oben erlaubt es, einen Typ
// auszuwählen und dann per Klick auf beliebige Zellen direkt zu setzen -
// genau wie im Original-Tool.
// ----------------------------------------------------------------------------

const DARK_BLUE = "#1A237E";
const DAY_WIDTH = 11;
const ROW_HEIGHT = 18;
const NAME_WIDTH = 140;
const BERUF_WIDTH = 90;
const ORT_WIDTH = 65;
const LABEL_WIDTH = NAME_WIDTH + BERUF_WIDTH + ORT_WIDTH;

export const planTypeBarColors = planTypeHexColors;

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
  editable?: boolean;
  onDataChanged?: () => void;
}

function getAusbildungsjahrRange(): { start: Date; end: Date } {
  return { start: new Date(2026, 8, 1), end: new Date(2027, 7, 31) };
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

function dayInfo(date: Date): { isSaturday: boolean; isSunday: boolean; holidayName: string | null } {
  const day = date.getDay();
  return { isSaturday: day === 6, isSunday: day === 0, holidayName: getHolidayName(fmt(date)) };
}

const PALETTE_TYPES: PlanEntryType[] = Object.keys(planTypeLabels) as PlanEntryType[];

export function AusbildungsplanMatrix({
  lehrlinge,
  planData,
  highlightPersonalnummer,
  editable = false,
  onDataChanged,
}: AusbildungsplanMatrixProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end } = useMemo(() => getAusbildungsjahrRange(), []);
  const days = useMemo(() => daysBetweenInclusive(start, end), [start, end]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeType, setActiveType] = useState<PlanEntryType | null>(null);

  const lehrjahrGruppen = useMemo(() => {
    const groups: Record<number, Lehrling[]> = { 1: [], 2: [], 3: [], 4: [] };
    lehrlinge.forEach((l) => {
      if (!groups[l.lehrjahr]) groups[l.lehrjahr] = [];
      groups[l.lehrjahr].push(l);
    });
    Object.values(groups).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [lehrlinge]);

  // Schnellzugriff: personalnummer -> (dateStr -> entry)
  const entryByPersonAndDate = useMemo(() => {
    const map = new Map<string, Map<string, PlanEntry>>();
    planData.forEach((entry) => {
      let inner = map.get(entry.personalnummer);
      if (!inner) {
        inner = new Map();
        map.set(entry.personalnummer, inner);
      }
      inner.set(entry.startDate, entry);
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
      subtitle: `${entry.startDate} · ${entry.location}`,
    });
  }

  function showDayTooltip(e: React.MouseEvent, date: Date, holidayName: string) {
    setTooltip({ x: e.clientX, y: e.clientY, title: holidayName, subtitle: fmt(date) });
  }

  function handleCellClick(lehrling: Lehrling, date: Date) {
    if (!editable || !activeType) return;
    const dateStr = fmt(date);
    const alle = DataStore.getPlanData();
    const existingIdx = alle.findIndex(
      (e) => e.personalnummer === lehrling.personalnummer && e.startDate === dateStr,
    );

    if (existingIdx >= 0) {
      const updated = [...alle];
      updated[existingIdx] = {
        ...updated[existingIdx],
        type: activeType,
        details: planTypeLabels[activeType],
        endDate: dateStr,
      };
      DataStore.setPlanData(updated);
    } else {
      const neuerEintrag: PlanEntry = {
        id: `zelle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        personalnummer: lehrling.personalnummer,
        lehrlingName: lehrling.name,
        lehrjahr: lehrling.lehrjahr,
        startDate: dateStr,
        endDate: dateStr,
        location: lehrling.standort ?? "",
        type: activeType,
        details: planTypeLabels[activeType],
      };
      DataStore.setPlanData([...alle, neuerEintrag]);
    }
    onDataChanged?.();
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

      {/* Farbpaletten-Werkzeug (nur editierbar) */}
      {editable && (
        <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {activeType
              ? `Aktiv: "${planTypeLabels[activeType]}" – klicke auf Tages-Zellen, um sie zu setzen`
              : "Typ auswählen, dann auf Zellen klicken um sie zu setzen"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(activeType === t ? null : t)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border-2 transition-all ${
                  activeType === t ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-gray-50"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: planTypeHexColors[t] }}
                />
                {planTypeLabels[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="border border-gray-300 rounded-lg overflow-hidden bg-white relative"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none text-white text-[10px] rounded px-2 py-1.5 shadow-xl max-w-xs leading-snug"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12, backgroundColor: DARK_BLUE }}
          >
            <p className="font-semibold">{tooltip.title}</p>
            <p className="opacity-80">{tooltip.subtitle}</p>
          </div>
        )}
        <div
          ref={scrollRef}
          onMouseLeave={() => setTooltip(null)}
          className="overflow-x-auto overflow-y-auto max-h-[70vh] scroll-thin"
        >
          <div style={{ width: LABEL_WIDTH + totalWidth, minWidth: "100%" }}>
            {/* Monats-Kopfzeile */}
            <div className="sticky top-0 z-20 flex" style={{ height: 14, backgroundColor: DARK_BLUE }}>
              <div className="sticky left-0 z-30 shrink-0" style={{ width: LABEL_WIDTH, backgroundColor: DARK_BLUE }} />
              <div className="relative" style={{ width: totalWidth }}>
                {monthMarkers.map((m) => (
                  <div
                    key={m.index}
                    className="absolute top-0 h-full flex items-center text-[8px] font-semibold text-white pl-1"
                    style={{ left: m.index * DAY_WIDTH, borderLeft: "2px solid rgba(255,255,255,.3)" }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Tages-Kopfzeile */}
            <div
              className="sticky z-20 flex text-white"
              style={{ top: 14, height: 14, backgroundColor: DARK_BLUE, fontSize: 8 }}
            >
              <div className="sticky left-0 z-30 shrink-0" style={{ width: LABEL_WIDTH, backgroundColor: DARK_BLUE }} />
              {days.map((d, idx) => {
                const isToday = fmt(d) === fmt(new Date());
                const { isSaturday, isSunday, holidayName } = dayInfos[idx];
                let bg: string | undefined;
                let color = "#fff";
                if (holidayName) {
                  bg = "#EF9A9A";
                  color = "#555";
                } else if (isSaturday) {
                  bg = "#FFE0B2";
                  color = "#555";
                } else if (isSunday) {
                  bg = "#BBDEFB";
                  color = "#555";
                }
                return (
                  <div
                    key={idx}
                    onMouseEnter={holidayName ? (e) => showDayTooltip(e, d, holidayName) : undefined}
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: DAY_WIDTH,
                      backgroundColor: isToday ? "#5C6BC0" : bg,
                      color: isToday ? "#fff" : color,
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Namens-Header-Zeile */}
            <div
              className="sticky z-20 flex text-white text-[9px] font-bold"
              style={{ top: 28, height: 16, backgroundColor: DARK_BLUE }}
            >
              <div
                className="sticky left-0 z-30 flex items-center pl-1 shrink-0"
                style={{ width: NAME_WIDTH, backgroundColor: DARK_BLUE }}
              >
                Name
              </div>
              <div
                className="sticky z-30 flex items-center pl-1 shrink-0"
                style={{ left: NAME_WIDTH, width: BERUF_WIDTH, backgroundColor: DARK_BLUE }}
              >
                Beruf
              </div>
              <div
                className="sticky z-30 flex items-center pl-1 shrink-0"
                style={{ left: NAME_WIDTH + BERUF_WIDTH, width: ORT_WIDTH, backgroundColor: DARK_BLUE }}
              >
                Ort
              </div>
              <div style={{ width: totalWidth }} />
            </div>

            {/* Lehrjahr-Gruppen + Lehrlings-Zeilen */}
            {[1, 2, 3, 4].map((lj) => {
              const gruppe = lehrjahrGruppen[lj] ?? [];
              if (gruppe.length === 0) return null;
              return (
                <div key={lj}>
                  <div
                    className="sticky left-0 z-10 px-2 flex items-center text-[11px] font-bold text-white"
                    style={{ height: 16, width: LABEL_WIDTH + totalWidth, backgroundColor: DARK_BLUE }}
                  >
                    {lj}. Lehrjahr ({gruppe.length})
                  </div>
                  {gruppe.map((lehrling) => {
                    const personEntries = entryByPersonAndDate.get(lehrling.personalnummer);
                    const isHighlighted = highlightPersonalnummer === lehrling.personalnummer;
                    return (
                      <div
                        key={lehrling.personalnummer}
                        className="flex border-b"
                        style={{ height: ROW_HEIGHT, borderColor: "#eee" }}
                      >
                        <div
                          className="sticky left-0 z-10 flex items-center pl-1 shrink-0 text-[11px] truncate"
                          style={{
                            width: NAME_WIDTH,
                            backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                            borderRight: "1px solid #ddd",
                          }}
                          title={lehrling.name}
                        >
                          {lehrling.name}
                        </div>
                        <div
                          className="sticky z-10 flex items-center pl-1 shrink-0 text-[9px] text-gray-600 truncate"
                          style={{
                            left: NAME_WIDTH,
                            width: BERUF_WIDTH,
                            backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                            borderRight: "1px solid #ddd",
                          }}
                          title={lehrling.beruf ?? ""}
                        >
                          {lehrling.beruf ?? ""}
                        </div>
                        <div
                          className="sticky z-10 flex items-center pl-1 shrink-0 text-[9px] text-gray-600 truncate"
                          style={{
                            left: NAME_WIDTH + BERUF_WIDTH,
                            width: ORT_WIDTH,
                            backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                            borderRight: "2px solid #aaa",
                          }}
                          title={lehrling.standort ?? ""}
                        >
                          {lehrling.standort ?? ""}
                        </div>
                        <div className="relative flex" style={{ width: totalWidth }}>
                          {days.map((d, idx) => {
                            const dateStr = fmt(d);
                            const entry = personEntries?.get(dateStr);
                            const { isSaturday, isSunday, holidayName } = dayInfos[idx];
                            let bg = "#fff";
                            if (entry) bg = planTypeBarColors[entry.type];
                            else if (holidayName) bg = "#FFEBEE";
                            else if (isSaturday) bg = "#FFF3E0";
                            else if (isSunday) bg = "#E3F2FD";

                            return (
                              <div
                                key={idx}
                                onClick={() => handleCellClick(lehrling, d)}
                                onMouseEnter={(e) => {
                                  if (entry) showEntryTooltip(e, entry);
                                  else if (holidayName) showDayTooltip(e, d, holidayName);
                                }}
                                className={editable ? "hover:ring-1 hover:ring-blue-500 cursor-pointer" : ""}
                                style={{
                                  width: DAY_WIDTH,
                                  height: "100%",
                                  backgroundColor: bg,
                                  borderRight: "0.5px solid rgba(0,0,0,.08)",
                                  flexShrink: 0,
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

      {/* Legende */}
      <div className="flex flex-wrap gap-3 pt-1">
        {PALETTE_TYPES.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: planTypeBarColors[type] }} />
            {planTypeLabels[type]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#FFF3E0" }} />
          Samstag
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#E3F2FD" }} />
          Sonntag
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#FFEBEE" }} />
          Feiertag
        </span>
      </div>
    </div>
  );
}
