import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, StickyNote, Trash2, X } from "lucide-react";
import type { Lehrling, PlanEntry } from "../types";
import { getMergedLabels, getMergedColors, getVersteckteKategorien } from "./ui/TypeBadge";
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
const BERUF_WIDTH_DESKTOP = 90;
const KOMMENTAR_WIDTH_DESKTOP = 26;
const GEBURTSDATUM_WIDTH_DESKTOP = 42;

function berechneAlter(geburtsdatum: string | undefined): string {
  if (!geburtsdatum) return "";
  const [tag, monat, jahr] = geburtsdatum.split(".").map(Number);
  if (!tag || !monat || !jahr) return "";
  const geburt = new Date(jahr, monat - 1, tag);
  if (Number.isNaN(geburt.getTime())) return "";
  const heute = new Date();
  let alter = heute.getFullYear() - geburt.getFullYear();
  const nochNichtGehabt =
    heute.getMonth() < geburt.getMonth() ||
    (heute.getMonth() === geburt.getMonth() && heute.getDate() < geburt.getDate());
  if (nochNichtGehabt) alter--;
  return `${alter} J.`;
}

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
  /** Öffnet den Einzelkalender eines Lehrlings (Kalender-Symbol neben dem Namen) */
  onOpenLehrling?: (personalnummer: string) => void;
}

interface ZellInfo {
  name: string;
  datum: string;
  titel: string;
  ort: string;
  farbe?: string;
}

const WOCHENTAG_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

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

function parseDateStr(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split(".").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function dayInfo(date: Date): { isSaturday: boolean; isSunday: boolean; holidayName: string | null } {
  const day = date.getDay();
  return { isSaturday: day === 6, isSunday: day === 0, holidayName: getHolidayName(fmt(date)) };
}

// Sticky-Klassen: jetzt auf allen Bildschirmgrößen aktiv (vorher nur ab lg/Desktop)
const STICKY_LEFT_CLASS = "sticky left-0";
const STICKY_CLASS = "sticky";

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
  onOpenLehrling,
}: AusbildungsplanMatrixProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end } = useMemo(() => getAusbildungsjahrRange(), []);
  const days = useMemo(() => daysBetweenInclusive(start, end), [start, end]);
  const [tooltip, setTooltipRaw] = useState<TooltipState | null>(null);
  const [zellInfo, setZellInfo] = useState<ZellInfo | null>(null);
  const [activeType, setActiveType] = useState<string | "leer" | null>(null);
  const [, forceRepaint] = useState(0);
  const [tick, setTick] = useState(0);
  const [neueKategorieOffen, setNeueKategorieOffen] = useState(false);
  const [neuerName, setNeuerName] = useState("");
  const [neueFarbe, setNeueFarbe] = useState(FARB_VORSCHLAEGE[0]);

  // Am Handy (< lg) werden Beruf/Kommentar/Alter ausgeblendet - sonst bleibt
  // vom Bildschirm kaum Platz für den eigentlichen Kalender übrig. Nur der
  // Name bleibt links fixiert sichtbar.
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Touch-Geräte ohne Maus: keine schwebenden Hover-Tooltips (die bleiben am
  // Handy sonst "kleben"), stattdessen Info-Leiste beim Antippen.
  const [kannHover, setKannHover] = useState(
    typeof window !== "undefined" ? window.matchMedia("(hover: hover)").matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setKannHover(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function setTooltip(t: TooltipState | null) {
    if (t && !kannHover) return;
    setTooltipRaw(t);
  }

  // Am Handy größere Zellen, damit man sie mit dem Finger treffen kann
  const dayW = isMobile ? 18 : DAY_WIDTH;
  const monatH = isMobile ? 18 : 14;
  const tagH = isMobile ? 18 : 14;
  const rowH = isMobile ? 28 : ROW_HEIGHT;
  const nameW = isMobile ? 112 : NAME_WIDTH;

  const BERUF_WIDTH = isMobile ? 0 : BERUF_WIDTH_DESKTOP;
  const KOMMENTAR_WIDTH = isMobile ? 0 : KOMMENTAR_WIDTH_DESKTOP;
  const GEBURTSDATUM_WIDTH = isMobile ? 0 : GEBURTSDATUM_WIDTH_DESKTOP;
  const LABEL_WIDTH = nameW + BERUF_WIDTH + KOMMENTAR_WIDTH + GEBURTSDATUM_WIDTH;
  const isPaintingRef = useRef(false);
  const paintedCellsRef = useRef<Set<string>>(new Set());
  const [markierterPersonalnummer, setMarkierterPersonalnummer] = useState<string | null>(null);
  const [bearbeiteterName, setBearbeiteterName] = useState<{ personalnummer: string; wert: string } | null>(
    null,
  );
  const [bearbeitetesFeld, setBearbeitetesFeld] = useState<{
    personalnummer: string;
    feld: "kommentar" | "geburtsdatum" | "beruf";
    wert: string;
    x: number;
    y: number;
  } | null>(null);
  const draggedPersonalnummerRef = useRef<string | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const planTypeLabels = useMemo(() => getMergedLabels(), [tick]);
  const planTypeBarColors = useMemo(() => getMergedColors(), [tick]);
  const versteckteKategorien = useMemo(() => getVersteckteKategorien(), [tick]);
  const PALETTE_TYPES = useMemo(
    () => Object.keys(planTypeLabels).filter((k) => !versteckteKategorien.has(k)),
    [planTypeLabels, versteckteKategorien],
  );

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

  async function reorderLehrling(lehrjahr: number, personalnummer: string, zielPersonalnummer: string) {
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
    const ok = await DataStore.setLehrlingeAwaited(aktualisiert);
    if (ok) {
      toast.success("Reihenfolge gespeichert");
    } else {
      toast.error("Reihenfolge konnte NICHT gespeichert werden - siehe Konsole (F12)");
    }
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

  async function handleNameSpeichern() {
    if (!bearbeiteterName) return;
    const neuerName = bearbeiteterName.wert.trim();
    setBearbeiteterName(null);
    if (!neuerName) return;
    const alleLehrlinge = DataStore.getLehrlinge();
    const aktualisiert = alleLehrlinge.map((l) =>
      l.personalnummer === bearbeiteterName.personalnummer ? { ...l, name: neuerName } : l,
    );
    const ok = await DataStore.setLehrlingeAwaited(aktualisiert);
    if (ok) {
      toast.success("Name gespeichert");
    } else {
      toast.error("Name konnte NICHT gespeichert werden - siehe Konsole (F12)");
    }
  }

  async function handleLehrlingLoeschen(lehrling: Lehrling) {
    if (
      !confirm(
        `${lehrling.name} wirklich komplett löschen? Das entfernt auch alle Kalender-Einträge dieser Person und kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    const ok = await DataStore.deleteLehrlingAwaited(lehrling.personalnummer);
    if (ok) {
      const restlichePlanEintraege = DataStore.getPlanData().filter(
        (e) => e.personalnummer !== lehrling.personalnummer,
      );
      await DataStore.setPlanDataAwaited(restlichePlanEintraege);
      toast.success(`${lehrling.name} gelöscht`);
      onDataChanged?.();
    } else {
      toast.error("Löschen fehlgeschlagen - siehe Konsole (F12)");
    }
  }

  async function handleFeldSpeichern() {
    if (!bearbeitetesFeld) return;
    const { personalnummer, feld, wert } = bearbeitetesFeld;
    setBearbeitetesFeld(null);
    const alleLehrlinge = DataStore.getLehrlinge();
    const aktualisiert = alleLehrlinge.map((l) =>
      l.personalnummer === personalnummer ? { ...l, [feld]: wert.trim() || undefined } : l,
    );
    const ok = await DataStore.setLehrlingeAwaited(aktualisiert);
    if (ok) {
      const label = feld === "kommentar" ? "Kommentar" : feld === "geburtsdatum" ? "Geburtsdatum" : "Beruf";
      toast.success(`${label} gespeichert`);
    } else {
      toast.error("Konnte nicht gespeichert werden - siehe Konsole (F12)");
    }
  }

  async function handleFarbeAendern(key: string, farbe: string) {
    const label = planTypeLabels[key] ?? key;
    const alle = DataStore.getKategorien();
    const idx = alle.findIndex((k) => k.key === key);
    const neueListe = idx >= 0 ? alle.map((k, i) => (i === idx ? { key, label, farbe } : k)) : [...alle, { key, label, farbe }];
    const ok = await DataStore.setKategorienAwaited(neueListe);
    if (ok) {
      toast.success("Farbe gespeichert");
    } else {
      toast.error("Farbe konnte NICHT gespeichert werden - siehe Konsole (F12)");
    }
  }

  async function handleKategorieLoeschen(key: string) {
    const label = planTypeLabels[key] ?? key;
    if (!confirm(`"${label}" aus der Werkzeugleiste entfernen? Bereits gesetzte Farbfelder mit diesem Typ bleiben unverändert erhalten, du kannst diesen Typ danach nur nicht mehr neu auswählen.`)) {
      return;
    }
    const alle = DataStore.getKategorien();
    const idx = alle.findIndex((k) => k.key === key);
    const farbe = planTypeBarColors[key] ?? "#9E9E9E";
    const neueListe =
      idx >= 0
        ? alle.map((k, i) => (i === idx ? { ...k, versteckt: true } : k))
        : [...alle, { key, label, farbe, versteckt: true }];
    const ok = await DataStore.setKategorienAwaited(neueListe);
    if (ok) {
      if (activeType === key) setActiveType(null);
      toast.success(`"${label}" entfernt`);
    } else {
      toast.error("Konnte nicht gespeichert werden - siehe Konsole (F12)");
    }
  }

  async function handleNeueKategorieSpeichern() {
    const name = neuerName.trim();
    if (!name) return;
    const key = `custom-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString(36).slice(-4)}`;
    const neueListe = [...DataStore.getKategorien(), { key, label: name, farbe: neueFarbe }];
    setActiveType(key);
    setNeuerName("");
    setNeueFarbe(FARB_VORSCHLAEGE[Math.floor(Math.random() * FARB_VORSCHLAEGE.length)]);
    setNeueKategorieOffen(false);
    const ok = await DataStore.setKategorienAwaited(neueListe);
    if (ok) {
      toast.success(`Kategorie "${name}" angelegt und gespeichert`);
    } else {
      toast.error(`Kategorie "${name}" konnte NICHT gespeichert werden - siehe Konsole (F12)`);
    }
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

  const totalWidth = days.length * dayW;

  const todayIdx = useMemo(() => days.findIndex((d) => fmt(d) === fmt(new Date())), [days]);

  function scrollToToday(smooth = false) {
    if (todayIdx >= 0 && scrollRef.current) {
      // Heute etwas links im sichtbaren Bereich, damit man die kommenden Tage sieht
      const sichtbar = scrollRef.current.clientWidth - LABEL_WIDTH;
      const ziel = Math.max(0, todayIdx * dayW - Math.min(200, sichtbar * 0.25));
      scrollRef.current.scrollTo({ left: ziel, behavior: smooth ? "smooth" : "auto" });
    }
  }

  // Sprung zum vorherigen/nächsten Monatsanfang
  function springeMonat(richtung: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const aktuellerIdx = Math.round(el.scrollLeft / dayW);
    const ziele = monthMarkers.map((m) => m.index);
    let zielIdx: number | undefined;
    if (richtung === 1) zielIdx = ziele.find((i) => i > aktuellerIdx + 1);
    else zielIdx = [...ziele].reverse().find((i) => i < aktuellerIdx - 1) ?? 0;
    if (zielIdx === undefined) zielIdx = ziele[ziele.length - 1] ?? 0;
    el.scrollTo({ left: zielIdx * dayW, behavior: "smooth" });
  }

  // Beim ersten Anzeigen und wenn sich die Zellbreite (Handy/Desktop) ändert
  useEffect(() => {
    scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayW]);

  function zeigeZellInfo(lehrling: Lehrling, date: Date, entry: PlanEntry | null | undefined, holidayName: string | null) {
    const datum = `${WOCHENTAG_KURZ[date.getDay()]} ${fmt(date)}`;
    if (entry) {
      setZellInfo({
        name: lehrling.name,
        datum,
        titel: entry.details || planTypeLabels[entry.type] || entry.type,
        ort: entry.location,
        farbe: planTypeBarColors[entry.type],
      });
    } else {
      const { isSaturday, isSunday } = dayInfo(date);
      setZellInfo({
        name: lehrling.name,
        datum,
        titel: holidayName ?? (isSaturday || isSunday ? "Wochenende" : "Kein Eintrag"),
        ort: "",
      });
    }
  }

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

    // Feiertage, Samstage und Sonntage sind geschützt und können nicht
    // übermalt oder gelöscht werden - sie bleiben immer automatisch erkennbar.
    const { isSaturday, isSunday, holidayName } = dayInfo(date);
    if (isSaturday || isSunday || holidayName) return;

    paintedCellsRef.current.add(cellKey);

    if (activeType === "leer") {
      pendingChangesRef.current.set(cellKey, null);
      forceRepaint((n) => n + 1);
      return;
    }

    const existing =
      pendingChangesRef.current.get(cellKey) ??
      entryByPersonAndDate.get(lehrling.personalnummer)?.get(dateStr);

    const HINWEIS_NACH_TYP: Record<string, string> = {
      "elektriker-st-martin": "Bitte Werkzeugrucksack mitnehmen",
      "werkstatt-st-martin": "Bitte Werkzeugrucksack mitnehmen",
    };
    const details = HINWEIS_NACH_TYP[activeType]
      ? `${planTypeLabels[activeType]} - ${HINWEIS_NACH_TYP[activeType]}`
      : planTypeLabels[activeType];

    const updatedEntry: PlanEntry = existing
      ? { ...existing, type: activeType, details, startDate: dateStr, endDate: dateStr }
      : {
          id: `zelle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          personalnummer: lehrling.personalnummer,
          lehrlingName: lehrling.name,
          lehrjahr: lehrling.lehrjahr,
          startDate: dateStr,
          endDate: dateStr,
          location: lehrling.standort ?? "",
          type: activeType,
          details,
        };

    pendingChangesRef.current.set(cellKey, updatedEntry);
    // Sofortiges visuelles Feedback ohne teuren State-Rerender pro Zelle:
    // wir committen erst am Ende des Zugs (onMouseUp) in den DataStore.
    forceRepaint((n) => n + 1);
  }

  async function commitPendingChanges() {
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
    const anzahl = pendingChangesRef.current.size;
    pendingChangesRef.current.clear();
    paintedCellsRef.current.clear();
    const ok = await DataStore.setPlanDataAwaited(Array.from(byKey.values()));
    onDataChanged?.();
    if (ok) {
      toast.success(anzahl === 1 ? "Änderung gespeichert" : `${anzahl} Änderungen gespeichert`);
    } else {
      toast.error("Speichern fehlgeschlagen - siehe Konsole (F12). Bitte nochmal versuchen.");
    }
  }

  function handleMouseDown(lehrling: Lehrling, date: Date) {
    if (!editable) return;
    if (!activeType) {
      // Kein Typ ausgewählt: Klick auf eine Zelle markiert/entmarkiert stattdessen die ganze Zeile
      setMarkierterPersonalnummer((aktuell) =>
        aktuell === lehrling.personalnummer ? null : lehrling.personalnummer,
      );
      return;
    }
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
    function handleGlobalTouchMove(e: TouchEvent) {
      if (!isPaintingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cellEl = el?.closest<HTMLElement>("[data-cell-personalnummer]");
      if (!cellEl) return;
      const personalnummer = cellEl.dataset.cellPersonalnummer;
      const dateStr = cellEl.dataset.cellDate;
      if (!personalnummer || !dateStr) return;
      const lehrling = lehrlinge.find((l) => l.personalnummer === personalnummer);
      if (!lehrling) return;
      e.preventDefault();
      paintCell(lehrling, parseDateStr(dateStr));
    }
    function handleGlobalTouchEnd() {
      if (isPaintingRef.current) {
        isPaintingRef.current = false;
        commitPendingChanges();
      }
    }
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalTouchEnd);
    window.addEventListener("touchcancel", handleGlobalTouchEnd);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
      window.removeEventListener("touchcancel", handleGlobalTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, lehrlinge]);

  return (
    <div className="flex flex-col gap-3">
      {/* Navigation: Heute + Monat vor/zurück */}
      <div className="order-1 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs sm:text-sm text-gray-500">
          {fmt(start)} – {fmt(end)} · {lehrlinge.length} {lehrlinge.length === 1 ? "Lehrling" : "Lehrlinge"}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => springeMonat(-1)}
            aria-label="Vorheriger Monat"
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollToToday(true)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-blue-700 hover:bg-blue-50 active:bg-blue-100"
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => springeMonat(1)}
            aria-label="Nächster Monat"
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Kalender-Übersicht */}
      <div
        className="order-3 border border-gray-300 rounded-lg overflow-hidden bg-white relative"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none text-white text-[10px] rounded px-2 py-1.5 shadow-xl max-w-xs leading-snug"
            style={{
              left: tooltip.x + 10 > window.innerWidth - 180 ? tooltip.x - 10 : tooltip.x + 10,
              top: tooltip.y + 10 > window.innerHeight - 60 ? tooltip.y - 40 : tooltip.y + 10,
              transform:
                tooltip.x + 10 > window.innerWidth - 180 ? "translateX(-100%)" : undefined,
              backgroundColor: DARK_BLUE,
            }}
          >
            <p className="font-semibold">{tooltip.title}</p>
            <p className="opacity-80">{tooltip.subtitle}</p>
          </div>
        )}
        {bearbeitetesFeld && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBearbeitetesFeld(null)} />
            <div
              className="fixed z-50 bg-white border border-blue-400 rounded-lg shadow-2xl p-2"
              style={{
                left: Math.min(bearbeitetesFeld.x, window.innerWidth - 240),
                top: Math.min(bearbeitetesFeld.y + 8, window.innerHeight - 70),
                width: 220,
              }}
            >
              <label className="block text-[9px] font-semibold text-gray-500 mb-1">
                {bearbeitetesFeld.feld === "kommentar"
                  ? "Kommentar"
                  : bearbeitetesFeld.feld === "geburtsdatum"
                    ? "Geburtsdatum (TT.MM.JJJJ)"
                    : "Beruf"}
              </label>
              {bearbeitetesFeld.feld === "kommentar" ? (
                <textarea
                  autoFocus
                  value={bearbeitetesFeld.wert}
                  onChange={(e) => setBearbeitetesFeld({ ...bearbeitetesFeld, wert: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setBearbeitetesFeld(null);
                  }}
                  rows={3}
                  placeholder="Kommentar..."
                  className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-[11px] outline-none focus:border-blue-500"
                />
              ) : (
                <input
                  autoFocus
                  placeholder={bearbeitetesFeld.feld === "geburtsdatum" ? "TT.MM.JJJJ" : "z.B. KT + ET"}
                  value={bearbeitetesFeld.wert}
                  onChange={(e) => setBearbeitetesFeld({ ...bearbeitetesFeld, wert: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFeldSpeichern();
                    if (e.key === "Escape") setBearbeitetesFeld(null);
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-[11px] outline-none focus:border-blue-500"
                />
              )}
              <div className="flex justify-end gap-1.5 mt-1.5">
                <button
                  onClick={() => setBearbeitetesFeld(null)}
                  className="text-[10px] px-2 py-1 text-gray-500 hover:text-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleFeldSpeichern}
                  className="text-[10px] px-2.5 py-1 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </div>
          </>
        )}
        <div
          ref={scrollRef}
          onMouseLeave={() => setTooltip(null)}
          onDragStart={(e) => e.preventDefault()}
          className={`overflow-x-auto overflow-y-auto max-h-[70vh] scroll-thin ${editable ? "select-none" : ""}`}
        >
          <div style={{ width: LABEL_WIDTH + totalWidth, minWidth: "100%" }}>
            {/* Monats-Kopfzeile */}
            <div className={`${STICKY_CLASS} top-0 z-20 flex`} style={{ height: monatH, backgroundColor: DARK_BLUE }}>
              <div className={`${STICKY_LEFT_CLASS} z-30 shrink-0`} style={{ width: LABEL_WIDTH, backgroundColor: DARK_BLUE }} />
              <div className="relative" style={{ width: totalWidth }}>
                {monthMarkers.map((m) => (
                  <div
                    key={m.index}
                    className={`absolute top-0 h-full flex items-center font-semibold text-white pl-1 whitespace-nowrap ${isMobile ? "text-[10px]" : "text-[8px]"}`}
                    style={{ left: m.index * dayW, borderLeft: "2px solid rgba(255,255,255,.3)" }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Tages-Kopfzeile */}
            <div
              className={`${STICKY_CLASS} z-20 flex text-white`}
              style={{ top: monatH, height: tagH, backgroundColor: DARK_BLUE, fontSize: isMobile ? 9 : 8 }}
            >
              <div
                className={`${STICKY_LEFT_CLASS} z-30 shrink-0 flex items-center pl-1 text-[10px] font-bold`}
                style={{ width: LABEL_WIDTH, backgroundColor: DARK_BLUE }}
              >
                {isMobile ? "Name" : ""}
              </div>
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
                      width: dayW,
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

            {/* Namens-Header-Zeile (am Handy in die Tageszeile integriert) */}
            {!isMobile && (
            <div
              className={`${STICKY_CLASS} z-20 flex text-white text-[9px] font-bold`}
              style={{ top: 28, height: 16, backgroundColor: DARK_BLUE }}
            >
              <div
                className={`${STICKY_LEFT_CLASS} z-30 flex items-center pl-1 shrink-0`}
                style={{ width: nameW, backgroundColor: DARK_BLUE }}
              >
                Name
              </div>
              {(
                <>
                  <div
                    className={`${STICKY_CLASS} z-30 flex items-center pl-1 shrink-0`}
                    style={{ left: nameW, width: BERUF_WIDTH, backgroundColor: DARK_BLUE }}
                  >
                    Beruf
                  </div>
                  <div
                    className={`${STICKY_CLASS} z-30 flex items-center justify-center shrink-0`}
                    style={{
                      left: nameW + BERUF_WIDTH,
                      width: KOMMENTAR_WIDTH,
                      backgroundColor: DARK_BLUE,
                    }}
                    title="Kommentar"
                  >
                    <StickyNote size={11} />
                  </div>
                  <div
                    className={`${STICKY_CLASS} z-30 flex items-center pl-1 shrink-0`}
                    style={{
                      left: nameW + BERUF_WIDTH + KOMMENTAR_WIDTH,
                      width: GEBURTSDATUM_WIDTH,
                      backgroundColor: DARK_BLUE,
                    }}
                  >
                    Alter
                  </div>
                </>
              )}
              <div style={{ width: totalWidth }} />
            </div>
            )}

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
                    const isHighlighted =
                      highlightPersonalnummer === lehrling.personalnummer ||
                      markierterPersonalnummer === lehrling.personalnummer;
                    return (
                      <div
                        key={lehrling.personalnummer}
                        className="flex border-b"
                        style={{
                          height: rowH,
                          borderColor: "#eee",
                          outline: isHighlighted ? "2px solid #1976D2" : undefined,
                          outlineOffset: isHighlighted ? "-1px" : undefined,
                        }}
                      >
                        <div
                          draggable={editable && kannHover && bearbeiteterName?.personalnummer !== lehrling.personalnummer}
                          onClick={() =>
                            setMarkierterPersonalnummer((aktuell) =>
                              aktuell === lehrling.personalnummer ? null : lehrling.personalnummer,
                            )
                          }
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleNameDragStart(lehrling.personalnummer);
                          }}
                          onDragOver={(e) => editable && e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleNameDrop(lj, lehrling.personalnummer);
                          }}
                          onDoubleClick={() =>
                            editable && setBearbeiteterName({ personalnummer: lehrling.personalnummer, wert: lehrling.name })
                          }
                          className={`${STICKY_LEFT_CLASS} z-10 flex items-center gap-1 pl-1 pr-0.5 shrink-0 truncate group ${
                            isMobile ? "text-[12px]" : "text-[11px]"
                          } ${editable && kannHover ? "cursor-grab active:cursor-grabbing" : ""}`}
                          style={{
                            width: nameW,
                            backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                            borderRight: "1px solid #ddd",
                          }}
                          title={
                            editable && kannHover
                              ? `${lehrling.name} · Nr. ${lehrling.personalnummer} (ziehen zum Verschieben, doppelklicken zum Umbenennen)`
                              : `${lehrling.name} · Nr. ${lehrling.personalnummer}`
                          }
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
                              {editable && kannHover && <span className="text-gray-300 shrink-0 select-none">⠿</span>}
                              <span className="truncate flex-1">{lehrling.name}</span>
                              {onOpenLehrling && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenLehrling(lehrling.personalnummer);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className={`shrink-0 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50 ${
                                    isMobile ? "p-1" : "p-0.5 opacity-60 group-hover:opacity-100"
                                  }`}
                                  title="Einzelkalender öffnen"
                                  aria-label={`Kalender von ${lehrling.name} öffnen`}
                                >
                                  <CalendarDays size={isMobile ? 14 : 11} />
                                </button>
                              )}
                              {editable && kannHover && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLehrlingLoeschen(lehrling);
                                  }}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                                  title="Lehrling löschen"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {!isMobile && (
                          <>
                            <div
                              onDoubleClick={(e) =>
                                editable &&
                                setBearbeitetesFeld({
                                  personalnummer: lehrling.personalnummer,
                                  feld: "beruf",
                                  wert: lehrling.beruf ?? "",
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              className={`${STICKY_CLASS} z-10 flex items-center pl-1 shrink-0 text-[9px] text-gray-600 truncate`}
                              style={{
                                left: nameW,
                                width: BERUF_WIDTH,
                                backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                                borderRight: "1px solid #ddd",
                                cursor: editable ? "pointer" : "default",
                              }}
                              title={editable ? (lehrling.beruf || "Doppelklick zum Bearbeiten") : lehrling.beruf ?? ""}
                            >
                              {lehrling.beruf ?? ""}
                            </div>
                            <div
                              onDoubleClick={(e) =>
                                editable &&
                                setBearbeitetesFeld({
                                  personalnummer: lehrling.personalnummer,
                                  feld: "kommentar",
                                  wert: lehrling.kommentar ?? "",
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              onMouseEnter={(e) => {
                                if (lehrling.kommentar) {
                                  setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    title: "Kommentar",
                                    subtitle: lehrling.kommentar,
                                  });
                                }
                              }}
                              onMouseLeave={() => setTooltip(null)}
                              className={`${STICKY_CLASS} z-10 flex items-center justify-center shrink-0`}
                              style={{
                                left: nameW + BERUF_WIDTH,
                                width: KOMMENTAR_WIDTH,
                                backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                                borderRight: "1px solid #ddd",
                                cursor: editable ? "pointer" : "default",
                              }}
                              title={!lehrling.kommentar && editable ? "Doppelklick, um einen Kommentar zu schreiben" : ""}
                            >
                              <StickyNote
                                size={12}
                                className={lehrling.kommentar ? "text-amber-500" : "text-gray-300"}
                                fill={lehrling.kommentar ? "currentColor" : "none"}
                              />
                            </div>
                            <div
                              onDoubleClick={(e) =>
                                editable &&
                                setBearbeitetesFeld({
                                  personalnummer: lehrling.personalnummer,
                                  feld: "geburtsdatum",
                                  wert: lehrling.geburtsdatum ?? "",
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              className={`${STICKY_CLASS} z-10 flex items-center justify-center shrink-0 text-[9px] text-gray-600 truncate`}
                              style={{
                                left: nameW + BERUF_WIDTH + KOMMENTAR_WIDTH,
                                width: GEBURTSDATUM_WIDTH,
                                backgroundColor: isHighlighted ? "#E3F2FD" : "#fafafa",
                                borderRight: "2px solid #aaa",
                              }}
                              title={
                                lehrling.geburtsdatum
                                  ? `Geburtsdatum: ${lehrling.geburtsdatum}${editable ? " (Doppelklick zum Bearbeiten)" : ""}`
                                  : editable
                                    ? "Doppelklick, um das Geburtsdatum einzutragen"
                                    : ""
                              }
                            >
                              {lehrling.geburtsdatum ? berechneAlter(lehrling.geburtsdatum) : ""}
                            </div>
                          </>
                        )}
                        <div className="relative flex" style={{ width: totalWidth }}>
                          {isHighlighted && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{ backgroundColor: "rgba(25, 118, 210, 0.18)", zIndex: 5 }}
                            />
                          )}
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
                                data-cell-personalnummer={lehrling.personalnummer}
                                data-cell-date={dateStr}
                                onMouseDown={() => handleMouseDown(lehrling, d)}
                                onTouchStart={(e) => {
                                  // Ohne aktiven Typ nichts tun: sonst wird beim Antippen
                                  // doppelt markiert (Touch + nachgeahmter Mausklick) und
                                  // schon das Scrollen würde Zeilen markieren.
                                  if (!activeType) return;
                                  e.preventDefault();
                                  handleMouseDown(lehrling, d);
                                }}
                                onClick={() => {
                                  if (!activeType) zeigeZellInfo(lehrling, d, entry, holidayName);
                                }}
                                onMouseEnter={(e) => {
                                  handleMouseEnterCell(lehrling, d);
                                  if (entry) showEntryTooltip(e, entry);
                                  else if (holidayName) showDayTooltip(e, d, holidayName);
                                }}
                                className={editable ? "hover:ring-1 hover:ring-blue-500 cursor-pointer select-none" : ""}
                                style={{
                                  width: dayW,
                                  height: "100%",
                                  backgroundColor: bg,
                                  borderRight: "0.5px solid rgba(0,0,0,.08)",
                                  boxShadow: idx === todayIdx ? "inset 2px 0 0 #3949AB, inset -2px 0 0 #3949AB" : undefined,
                                  flexShrink: 0,
                                  touchAction: activeType ? "none" : undefined,
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

      {/* Info-Leiste: zeigt den zuletzt angetippten Tag (vor allem fürs Handy) */}
      {zellInfo && !activeType && (
        <div className="order-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
          <span
            className="mt-1 w-3 h-3 rounded-sm shrink-0 border border-black/10"
            style={{ backgroundColor: zellInfo.farbe ?? "#fff" }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{zellInfo.name}</span> · {zellInfo.datum}
            </p>
            <p className="text-sm font-semibold text-gray-800 break-words">{zellInfo.titel}</p>
            {zellInfo.ort && <p className="text-xs text-gray-500">{zellInfo.ort}</p>}
          </div>
          <button
            type="button"
            onClick={() => setZellInfo(null)}
            aria-label="Info schließen"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {editable && (
        <div className="order-2 lg:order-5 rounded-xl border border-gray-200 bg-white/70 p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-gray-500">
              {activeType
                ? `Aktiv: "${activeType === "leer" ? "Leer / Löschen" : planTypeLabels[activeType]}" – ${
                    kannHover
                      ? "klicke und ziehe über Zellen, um mehrere auf einmal zu setzen"
                      : "tippe oder wische über Tage. Zum Scrollen erst „Fertig“ drücken."
                  }`
                : kannHover
                  ? "Typ auswählen, dann klicken und ziehen um Zellen zu setzen"
                  : "Zum Bearbeiten Typ wählen – oder einfach auf einen Tag tippen, um Details zu sehen."}
            </p>
            {activeType && (
              <button
                type="button"
                onClick={() => setActiveType(null)}
                className="shrink-0 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Fertig
              </button>
            )}
          </div>
          <div
            className={
              isMobile
                ? "-mx-3 px-3 flex flex-nowrap gap-1.5 overflow-x-auto scroll-thin pb-1"
                : "flex flex-wrap gap-1.5"
            }
          >
            <button
              onClick={() => setActiveType(activeType === "leer" ? null : "leer")}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border-2 transition-all ${
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
                className={`shrink-0 flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-md text-[11px] border-2 transition-all ${
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKategorieLoeschen(t);
                  }}
                  className="text-gray-300 hover:text-red-500 shrink-0 ml-0.5"
                  title="Diese Kategorie nicht mehr benötigt? Aus der Werkzeugleiste entfernen"
                >
                  ✕
                </button>
              </div>
            ))}

            {neueKategorieOffen ? (
              <div className="shrink-0 flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md text-[11px] border-2 border-dashed border-blue-300 bg-blue-50/50">
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
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
                title="Neue Aktivität/Kategorie mit eigener Farbe anlegen"
              >
                + Neue Kategorie
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
