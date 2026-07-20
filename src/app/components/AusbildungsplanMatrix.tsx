import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Lehrling, PlanEntry } from "../types";
import { getMergedLabels, getMergedColors } from "./ui/TypeBadge";
import { getHolidayName } from "../data/holidays";
import { DataStore, subscribeToDataChanges } from "../data/store";

// ----------------------------------------------------------------------------
// AusbildungsplanMatrix
//
// 1:1 an das Original-Excel-artige Planungstool angelehnte Gantt-Matrix:
// dunkelblaue Header (#1A237E), Spalten Name/Beruf/Ort, JEDER TAG ist eine
// eigenständige, einzeln klickbare quadratische Zelle (kein zusammenhängender
// Balken mehr). Ein Farbpaletten-Werkzeug oben erlaubt es, einen Typ
// auszuwählen und dann per Klick auf beliebige Zellen direkt zu setzen -
// genau wie im Original-Tool.
//
// WICHTIG (Mobile-Fix): Die Name/Beruf/Ort-Spalten sind nur ab Desktop-Breite
// (lg:) sticky/fixiert. Auf Mobile (unter dem lg-Breakpoint) scrollen sie
// ganz normal mit, damit beim horizontalen Scrollen durch die Tage nicht der
// halbe Bildschirm dauerhaft von den Namen blockiert wird. Das Desktop-
// Verhalten bleibt dadurch komplett unverändert.
// ----------------------------------------------------------------------------

const DARK_BLUE = "#1A237E";
const DAY_WIDTH = 11;
const ROW_HEIGHT = 18;
const NAME_WIDTH = 140;
const BERUF_WIDTH = 90;
const ORT_WIDTH = 65;
const LABEL_WIDTH = NAME_WIDTH + BERUF_WIDTH + ORT_WIDTH;

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

// Sticky-Klassen: nur ab lg (Desktop) fixiert, auf Mobile ganz normal im Fluss
const STICKY_LEFT_CLASS = "static lg:sticky lg:left-0";
const STICKY_CLASS = "static lg:sticky";

// Ein paar Vorschlagsfarben für neue, selbst angelegte Kategorien
const FARB_VORSCHLAEGE = [
  "#4CAF50", "#3d6d8f", "#00B0F0", "#FF6600", "#66FFFF", "#0099FF",
  "#FF6699", "#C00000", "#9E9E9E", "#CE93D8", "#00B050", "#FFBF3F",
  "#FF7043", "#ff69b4", "#761c82", "#6bff7c", "#a3d34a", "#e00673",
];

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
  const [activeType, setActiveType] = useState<string | "leer" | null>(null);
  const [, forceRepaint] = useState(0);
  const [tick, setTick] = useState(0);
  const [neueKategorieOffen, setNeueKategorieOffen] = useState(false);
  const [neuerName, setNeuerName] = useState("");
  const [neueFarbe, setNeueFarbe] = useState(FARB_VORSCHLAEGE[0]);
  const isPaintingRef = useRef(false);
  const paintedCellsRef = useRef<Set<string>>(new Set());
  const [bearbeiteterName, setBearbeiteterName] = useState<{ personalnummer: string; wert: string } | null>(
    null,
  );
  const draggedPersonalnummerRef = useRef<string | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const planTypeLabels = useMemo(() => getMergedLabels(), [tick]);
  const planTypeBarColors = useMemo(() => getMergedColors(), [tick]);
  const PALETTE_TYPES = useMemo(() => Object.keys(planTypeLabels), [planTypeLabels]);

  const lehrjahrGruppen = useMemo(() => {
    const groups: Record<number, Lehrling[]> = { 1: [], 2: [], 3: [], 4: [] };
    lehrlinge.forEach((l) => {
      if (!groups[l.lehrjahr]) groups[l.lehrjahr] = [];
      groups[l.lehrjahr].push(l);
    });
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => {
        const ra = a.reihenfolge ?? Number.MAX_SAFE_INTEGER;
        const rb = b.reihenfolge ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      }),
    );
    return groups;
  }, [lehrlinge]);

  function reorderLehrling(lehrjahr: number, personalnummer: string, zielPersonalnummer: string) {
    const gruppe = [...(lehrjahrGruppen[lehrjahr] ?? [])];
    const fromIdx = gruppe.findIndex((l) => l.personalnummer === personalnummer);
    const toIdx = gruppe.findIndex((l) => l.personalnummer === zielPersonalnummer);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    const [moved] = gruppe.splice(fromIdx, 1);
    gruppe.splice(toIdx, 0, moved);
    const reihenfolgeByPersonalnummer = new Map(gruppe.map((l, i) => [l.personalnummer, i]));

    const alleLehrlinge = DataStore.getLehrlinge();
    const aktualisiert = alleLehrlinge.map((l) =>
      reihenfolgeByPersonalnummer.has(l.personalnummer)
        ? { ...l, reihenfolge: reihenfolgeByPersonalnummer.get(l.personalnummer) }
        : l,
    );
    DataStore.setLehrlinge(aktualisiert);
    toast.success("Reihenfolge gespeichert");
  }

  function handleNameDragStart(personalnummer: string) {
    draggedPersonalnummerRef.current = personalnummer;
  }

  function handleNameDrop(lehrjahr: number, zielPersonalnummer: string) {
    const dragged = draggedPersonalnummerRef.current;
    draggedPersonalnummerRef.current = null;
    if (!dragged || dragged === zielPersonalnummer) return;
    reorderLehrling(lehrjahr, dragged, zielPersonalnummer);
  }

  function handleNameSpeichern() {
    if (!bearbeiteterName) return;
    const neuerName = bearbeiteterName.wert.trim();
    setBearbeiteterName(null);
    if (!neuerName) return;
    const alleLehrlinge = DataStore.getLehrlinge();
    const aktualisiert = alleLehrlinge.map((l) =>
      l.personalnummer === bearbeiteterName.personalnummer ? { ...l, name: neuerName } : l,
    );
    DataStore.setLehrlinge(aktualisiert);
    toast.success("Name gespeichert");
  }

  function handleFarbeAendern(key: string, farbe: string) {
    const label = planTypeLabels[key] ?? key;
    DataStore.upsertKategorie(key, label, farbe);
    toast.success("Farbe gespeichert");
  }

  function handleNeueKategorieSpeichern() {
    const name = neuerName.trim();
    if (!name) return;
    const key = `custom-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString(36).slice(-4)}`;
    DataStore.upsertKategorie(key, name, neueFarbe);
    setActiveType(key);
    setNeuerName("");
    setNeueFarbe(FARB_VORSCHLAEGE[Math.floor(Math.random() * FARB_VORSCHLAEGE.length)]);
    setNeueKategorieOffen(false);
    toast.success(`Kategorie "${name}" angelegt`);
  }

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

  const pendingChangesRef = useRef<Map<string, PlanEntry | null>>(new Map());

  function paintCell(lehrling: Lehrling, date: Date) {
    if (!editable || !activeType) return;
    const dateStr = fmt(date);
    const cellKey = `${lehrling.personalnummer}|${dateStr}`;
    if (paintedCellsRef.current.has(cellKey)) return; // schon in diesem Zug bemalt
    paintedCellsRef.current.add(cellKey);

    if (activeType === "leer") {
      pendingChangesRef.current.set(cellKey, null);
      forceRepaint((n) => n + 1);
      return;
    }

    const existing =
      pendingChangesRef.current.get(cellKey) ??
      entryByPersonAndDate.get(lehrling.personalnummer)?.get(dateStr);

    const updatedEntry: PlanEntry = existing
      ? { ...existing, type: activeType, details: planTypeLabels[activeType], startDate: dateStr, endDate: dateStr }
      : {
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

    pendingChangesRef.current.set(cellKey, updatedEntry);
    // Sofortiges visuelles Feedback ohne teuren State-Rerender pro Zelle:
    // wir committen erst am Ende des Zugs (onMouseUp) in den DataStore.
    forceRepaint((n) => n + 1);
  }

  function commitPendingChanges() {
    if (pendingChangesRef.current.size === 0) return;
    const alle = DataStore.getPlanData();
    const byKey = new Map(alle.map((e) => [`${e.personalnummer}|${e.startDate}`, e]));
    pendingChangesRef.current.forEach((entry, key) => {
      if (entry === null) {
        byKey.delete(key);
      } else {
        byKey.set(key, entry);
      }
    });
    DataStore.setPlanData(Array.from(byKey.values()));
    const anzahl = pendingChangesRef.current.size;
    pendingChangesRef.current.clear();
    paintedCellsRef.current.clear();
    onDataChanged?.();
    toast.success(anzahl === 1 ? "Änderung gespeichert" : `${anzahl} Änderungen gespeichert`);
  }

  function handleMouseDown(lehrling: Lehrling, date: Date) {
    if (!editable || !activeType) return;
    isPaintingRef.current = true;
    paintCell(lehrling, date);
  }

  function handleMouseEnterCell(lehrling: Lehrling, date: Date) {
    if (isPaintingRef.current) {
      paintCell(lehrling, date);
    }
  }

  useEffect(() => {
    function handleGlobalMouseUp() {
      if (isPaintingRef.current) {
        isPaintingRef.current = false;
        commitPendingChanges();
      }
    }
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

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
              ? `Aktiv: "${activeType === "leer" ? "Leer / Löschen" : planTypeLabels[activeType]}" – klicke und ziehe über Zellen, um mehrere auf einmal zu setzen`
              : "Typ auswählen, dann klicken und ziehen um Zellen zu setzen"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveType(activeType === "leer" ? null : "leer")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border-2 transition-all ${
                activeType === "leer" ? "border-red-600 bg-red-50" : "border-transparent hover:bg-gray-50"
              }`}
              title="Zellen leeren (z.B. für Feiertage ohne Eintrag)"
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0 border border-gray-400"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #fff, #fff 2px, #f87171 2px, #f87171 3px)",
                }}
              />
              Leer / Löschen
            </button>
            {PALETTE_TYPES.map((t) => (
              <div
                key={t}
                className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-md text-[11px] border-2 transition-all ${
                  activeType === t ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-gray-50"
                }`}
              >
                <label
                  className="w-3 h-3 rounded-sm shrink-0 cursor-pointer border border-black/10"
                  style={{ backgroundColor: planTypeBarColors[t] }}
                  title="Farbe ändern"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="color"
                    className="sr-only"
                    value={planTypeBarColors[t]}
                    onChange={(e) => handleFarbeAendern(t, e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setActiveType(activeType === t ? null : t)}
                  className="whitespace-nowrap"
                >
                  {planTypeLabels[t]}
                </button>
              </div>
            ))}

            {neueKategorieOffen ? (
              <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md text-[11px] border-2 border-dashed border-blue-300 bg-blue-50/50">
                <label
                  className="w-3 h-3 rounded-sm shrink-0 cursor-pointer border border-black/10"
                  style={{ backgroundColor: neueFarbe }}
                  title="Farbe wählen"
                >
                  <input
                    type="color"
                    className="sr-only"
                    value={neueFarbe}
                    onChange={(e) => setNeueFarbe(e.target.value)}
                  />
                </label>
                <input
                  autoFocus
                  value={neuerName}
                  onChange={(e) => setNeuerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNeueKategorieSpeichern();
                    if (e.key === "Escape") setNeueKategorieOffen(false);
                  }}
                  placeholder="z.B. BS Kältetechnik"
                  className="w-32 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleNeueKategorieSpeichern}
                  className="text-green-700 font-bold px-1"
                  title="Speichern"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setNeueKategorieOffen(false)}
                  className="text-gray-400 font-bold px-1"
                  title="Abbrechen"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNeueKategorieOffen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
                title="Neue Aktivität/Kategorie mit eigener Farbe anlegen"
              >
                + Neue Kategorie
              </button>
            )}
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
          onDragStart={(e) => e.preventDefault()}
          className={`overflow-x-auto overflow-y-auto max-h-[70vh] scroll-thin ${editable ? "select-none" : ""}`}
        >
          <div style={{ width: LABEL_WIDTH + totalWidth, minWidth: "100%" }}>
            {/* Monats-Kopfzeile */}
            <div className={`${STICKY_CLASS} top-0 z-20 flex`} style={{ height: 14, backgroundColor: DARK_BLUE }}>
              <div className={`${STICKY_LEFT_CLASS} z-30 shrink-0`} style={{ width: LABEL_WIDTH, backgroundColor: DARK_BLUE }} />
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
              className={`${STICKY_CLASS} z-20 flex text-white`}
              style={{ top: 14, height: 14, backgroundColor: DARK_BLUE, fontSize: 8 }}
            >
              <div className={`${STICKY_LEFT_CLASS} z-30 shrink-0`} style={{ width: LABEL_WIDTH, backgroundColor: DARK_BLUE }} />
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
              className={`${STICKY_CLASS} z-20 flex text-white text-[9px] font-bold`}
              style={{ top: 28, height: 16, backgroundColor: DARK_BLUE }}
            >
              <div
                className={`${STICKY_LEFT_CLASS} z-30 flex items-center pl-1 shrink-0`}
                style={{ width: NAME_WIDTH, backgroundColor: DARK_BLUE }}
              >
                Name
              </div>
              <div
                className={`${STICKY_CLASS} z-30 flex items-center pl-1 shrink-0`}
                style={{ left: NAME_WIDTH, width: BERUF_WIDTH, backgroundColor: DARK_BLUE }}
              >
                Beruf
              </div>
              <div
                className={`${STICKY_CLASS} z-30 flex items-center pl-1 shrink-0`}
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
                    className={`${STICKY_LEFT_CLASS} z-10 px-2 flex items-center text-[11px] font-bold text-white`}
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
                          draggable={editable && bearbeiteterName?.personalnummer !== lehrling.personalnummer}
                          onDragStart={() => handleNameDragStart(lehrling.personalnummer)}
                          onDragOver={(e) => editable && e.preventDefault()}
                          onDrop={() => handleNameDrop(lj, lehrling.personalnummer)}
                          onDoubleClick={() =>
                            editable && setBearbeiteterName({ personalnummer: lehrling.personalnummer, wert: lehrling.name })
                          }
                          className={`${STICKY_LEFT_CLASS} z-10 flex items-center gap-1 pl-1 shrink-0 text-[11px] truncate ${
                            editable ? "cursor-grab active:cursor-grabbing" : ""
                          }`}
                          style={{
                            width: NAME_WIDTH,
                            backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                            borderRight: "1px solid #ddd",
                          }}
                          title={editable ? `${lehrling.name} (ziehen zum Verschieben, doppelklicken zum Umbenennen)` : lehrling.name}
                        >
                          {bearbeiteterName?.personalnummer === lehrling.personalnummer ? (
                            <input
                              autoFocus
                              value={bearbeiteterName.wert}
                              onChange={(e) => setBearbeiteterName({ personalnummer: lehrling.personalnummer, wert: e.target.value })}
                              onBlur={handleNameSpeichern}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleNameSpeichern();
                                if (e.key === "Escape") setBearbeiteterName(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-white border border-blue-400 rounded px-1 text-[11px] outline-none"
                            />
                          ) : (
                            <>
                              {editable && <span className="text-gray-300 shrink-0 select-none">⠿</span>}
                              <span className="truncate">{lehrling.name}</span>
                            </>
                          )}
                        </div>
                        <div
                          className={`${STICKY_CLASS} z-10 flex items-center pl-1 shrink-0 text-[9px] text-gray-600 truncate`}
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
                          className={`${STICKY_CLASS} z-10 flex items-center pl-1 shrink-0 text-[9px] text-gray-600 truncate`}
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
                            const cellKey = `${lehrling.personalnummer}|${dateStr}`;
                            const entry = pendingChangesRef.current.has(cellKey)
                              ? pendingChangesRef.current.get(cellKey)
                              : personEntries?.get(dateStr);
                            const { isSaturday, isSunday, holidayName } = dayInfos[idx];
                            let bg = "#fff";
                            if (entry) bg = planTypeBarColors[entry.type];
                            else if (holidayName) bg = "#FFEBEE";
                            else if (isSaturday) bg = "#FFF3E0";
                            else if (isSunday) bg = "#E3F2FD";

                            return (
                              <div
                                key={idx}
                                onMouseDown={() => handleMouseDown(lehrling, d)}
                                onMouseEnter={(e) => {
                                  handleMouseEnterCell(lehrling, d);
                                  if (entry) showEntryTooltip(e, entry);
                                  else if (holidayName) showDayTooltip(e, d, holidayName);
                                }}
                                className={editable ? "hover:ring-1 hover:ring-blue-500 cursor-pointer select-none" : ""}
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
      </div>
    </div>
  );
}
