import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PlanEntry } from "../types";
import { getMergedLabels, getMergedColors } from "./ui/TypeBadge";
import { parseDate } from "../utils/dateUtils";
import { getHolidayName } from "../data/holidays";
import { DataStore } from "../data/store";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

// ----------------------------------------------------------------------------
// LehrlingMonatskalender
//
// Google-Calendar-artiger Kachel-Monatskalender für einen einzelnen Lehrling.
// Zeigt nur dessen eigenen Plan, mit Vor/Zurück-Navigation zwischen Monaten.
// Wochenenden und Feiertage sind grau/rot markiert.
//
// Im editierbaren Modus (editable=true, für Admin) kann der ausgewählte Tag
// bearbeitet/gelöscht werden, und neue Einträge können hinzugefügt werden.
// ----------------------------------------------------------------------------

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

interface LehrlingMonatskalenderProps {
  planData: PlanEntry[];
  editable?: boolean;
  personalnummer?: string;
  lehrlingName?: string;
  lehrjahr?: number;
  standort?: string;
  onDataChanged?: () => void;
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

// Hex-Farbe (#RRGGBB oder #RGB) als halbtransparente Hintergrundfarbe
function tint(hex: string | undefined, alpha: number): string | undefined {
  if (!hex || !hex.startsWith("#")) return undefined;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return undefined;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return undefined;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Ausbildungsjahr, in dem die Plandaten liegen
const PLAN_START = new Date(2026, 8, 1);
const PLAN_ENDE = new Date(2027, 7, 31);

function heute(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function heuteImPlan(): boolean {
  const h = heute();
  return h >= PLAN_START && h <= PLAN_ENDE;
}

function startMonat(): Date {
  const heute = new Date();
  if (heute >= PLAN_START && heute <= PLAN_ENDE) {
    return new Date(heute.getFullYear(), heute.getMonth(), 1);
  }
  return new Date(PLAN_START);
}

interface MonatsAbschnitt {
  von: Date;
  bis: Date;
  entry: PlanEntry;
}

export function LehrlingMonatskalender({
  planData,
  editable = false,
  personalnummer,
  lehrlingName,
  lehrjahr,
  standort,
  onDataChanged,
}: LehrlingMonatskalenderProps) {
  const [anchor, setAnchor] = useState(startMonat);
  // Beim Öffnen gleich den heutigen Tag anzeigen (falls im Ausbildungsjahr)
  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(() =>
    heuteImPlan() ? findEntryForDate(planData, heute()) : null,
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => (heuteImPlan() ? heute() : null));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntry, setModalEntry] = useState<PlanEntry | null>(null);
  const [modalPrefillDate, setModalPrefillDate] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const planTypeLabels = getMergedLabels();
  const planTypeBarColors = getMergedColors();

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

  // Einträge pro Tag dieses Monats einmal berechnen
  const entryProTag = useMemo(() => {
    const map = new Map<number, PlanEntry | null>();
    for (let d = 1; d <= daysInMonth; d++) {
      map.set(d, findEntryForDate(planData, new Date(year, month, d)));
    }
    return map;
  }, [planData, year, month, daysInMonth]);

  // Aufeinanderfolgende Tage mit gleichem Eintrag zusammenfassen (Wochenenden
  // und Feiertage unterbrechen einen Block nicht)
  const abschnitte = useMemo(() => {
    const liste: MonatsAbschnitt[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const entry = entryProTag.get(d);
      if (!entry) continue;
      const datum = new Date(year, month, d);
      const letzter = liste[liste.length - 1];
      const gleich =
        letzter &&
        letzter.entry.type === entry.type &&
        (letzter.entry.details ?? "") === (entry.details ?? "") &&
        (letzter.entry.location ?? "") === (entry.location ?? "");
      if (gleich) {
        // Lücke nur aus Wochenende/Feiertag? Dann gleicher Block
        let nurFreieTage = true;
        for (let z = letzter.bis.getDate() + 1; z < d; z++) {
          const zwischen = new Date(year, month, z);
          const frei =
            zwischen.getDay() === 0 || zwischen.getDay() === 6 || !!getHolidayName(fmt(zwischen));
          if (!frei || entryProTag.get(z)) {
            nurFreieTage = false;
            break;
          }
        }
        if (nurFreieTage) {
          letzter.bis = datum;
          continue;
        }
      }
      liste.push({ von: datum, bis: datum, entry });
    }
    return liste;
  }, [entryProTag, year, month, daysInMonth]);

  const genutzteTypen = useMemo(() => {
    const set = new Set<string>();
    abschnitte.forEach((a) => set.add(a.entry.type));
    return Array.from(set);
  }, [abschnitte]);

  function shiftMonth(delta: number) {
    setAnchor(new Date(year, month + delta, 1));
    setSelectedEntry(null);
    setSelectedDate(null);
  }

  function goToToday() {
    const h = heute();
    setAnchor(new Date(h.getFullYear(), h.getMonth(), 1));
    setSelectedEntry(findEntryForDate(planData, h));
    setSelectedDate(h);
  }

  function handleDayClick(date: Date, entry: PlanEntry | null) {
    setSelectedDate(date);
    setSelectedEntry(entry);
  }

  // Wischen nach links/rechts wechselt den Monat (Handy)
  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const startPunkt = touchStartRef.current;
    touchStartRef.current = null;
    const t = e.changedTouches[0];
    if (!startPunkt || !t) return;
    const dx = t.clientX - startPunkt.x;
    const dy = t.clientY - startPunkt.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      shiftMonth(dx < 0 ? 1 : -1);
    }
  }

  function openEditModal(entry: PlanEntry) {
    setModalEntry(entry);
    setModalPrefillDate(null);
    setModalOpen(true);
  }

  function openNewModal(date: Date) {
    setModalEntry(null);
    setModalPrefillDate(fmt(date));
    setModalOpen(true);
  }

  async function handleDelete(entry: PlanEntry) {
    if (!confirm(`Eintrag "${entry.details}" wirklich löschen?`)) return;
    const alle = DataStore.getPlanData();
    const ok = await DataStore.setPlanDataAwaited(alle.filter((e) => e.id !== entry.id));
    setSelectedEntry(null);
    if (ok) {
      toast.success("Eintrag gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen - siehe Konsole (F12)");
    }
    onDataChanged?.();
  }

  const heuteStr = fmt(heute());
  const ausgewaehltStr = selectedDate ? fmt(selectedDate) : null;

  function zeitraum(a: MonatsAbschnitt): string {
    const kurz = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
    return a.von.getTime() === a.bis.getTime() ? kurz(a.von) : `${kurz(a.von)} – ${kurz(a.bis)}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Vorheriger Monat"
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base sm:text-sm font-semibold text-gray-700 min-w-[130px] sm:min-w-[160px] text-center capitalize">
            {firstOfMonth.toLocaleDateString("de-AT", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Nächster Monat"
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 active:bg-blue-100"
        >
          Heute
        </button>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="space-y-1">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
          {WOCHENTAGE.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} className="aspect-square sm:aspect-[4/3]" />;

            const entry = entryProTag.get(date.getDate()) ?? null;
            const dateStr = fmt(date);
            const isToday = dateStr === heuteStr;
            const isSelected = dateStr === ausgewaehltStr;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const holidayName = getHolidayName(dateStr);
            const barColor = entry ? planTypeBarColors[entry.type] : undefined;
            const hintergrund = holidayName
              ? "#FEF2F2"
              : entry
                ? (tint(barColor, 0.14) ?? "#FFFFFF")
                : isWeekend
                  ? "#F9FAFB"
                  : "#FFFFFF";

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(date, entry)}
                aria-label={`${date.toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" })}${
                  entry ? `: ${planTypeLabels[entry.type] ?? entry.details}` : holidayName ? `: ${holidayName}` : ""
                }`}
                className={`relative aspect-square sm:aspect-[4/3] rounded-lg border p-1 sm:p-1.5 flex flex-col items-start justify-start text-left transition-all overflow-hidden ${
                  isSelected
                    ? "border-blue-600 ring-2 ring-blue-300"
                    : isToday
                      ? "border-blue-400 ring-2 ring-blue-200"
                      : holidayName
                        ? "border-red-100"
                        : isWeekend
                          ? "border-gray-100"
                          : "border-gray-200"
                } hover:shadow-md cursor-pointer`}
                style={{ backgroundColor: hintergrund }}
                title={holidayName ?? entry?.details}
              >
                <span
                  className={`text-xs sm:text-[11px] leading-none ${
                    isToday
                      ? "font-bold text-white bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center -ml-0.5 -mt-0.5"
                      : isWeekend || holidayName
                        ? "text-gray-400"
                        : "text-gray-600"
                  }`}
                >
                  {date.getDate()}
                </span>
                {entry && (
                  <>
                    {/* Handy: farbiger Balken ohne Text (Text passt dort nicht rein) */}
                    <span
                      className="sm:hidden absolute left-1 right-1 bottom-1 h-1.5 rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                    {/* Ab Tablet: Balken mit Beschriftung */}
                    <span
                      className="hidden sm:block mt-1 w-full text-[9px] leading-tight rounded px-1 py-0.5 truncate text-white font-medium"
                      style={{ backgroundColor: barColor }}
                    >
                      {planTypeLabels[entry.type]}
                    </span>
                  </>
                )}
                {holidayName && !entry && (
                  <>
                    <span className="sm:hidden absolute left-1 right-1 bottom-1 h-1.5 rounded-full bg-red-300" />
                    <span className="hidden sm:block mt-1 text-[8px] text-red-500 leading-tight truncate w-full">
                      {holidayName}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <p className="sm:hidden text-center text-[11px] text-gray-400 pt-1">
          Tippe auf einen Tag für Details · wische für den nächsten Monat
        </p>
      </div>

      {/* Detail-Panel für ausgewählten Tag mit Eintrag */}
      {selectedEntry && (
        <div
          className="rounded-xl border bg-white/80 p-4"
          style={{ borderColor: tint(planTypeBarColors[selectedEntry.type], 0.5) ?? "#E5E7EB" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400 mb-1">
                {selectedDate
                  ? selectedDate.toLocaleDateString("de-AT", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })
                  : `${selectedEntry.startDate} – ${selectedEntry.endDate}`}
                {selectedDate && fmt(selectedDate) === heuteStr ? " · Heute" : ""}
              </p>
              <p className="font-semibold text-gray-800 break-words">{selectedEntry.details}</p>
              {selectedEntry.location && (
                <p className="text-sm text-gray-500 mt-0.5">{selectedEntry.location}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
              <span
                className="text-xs text-white font-medium rounded-full px-3 py-1 whitespace-nowrap"
                style={{ backgroundColor: planTypeBarColors[selectedEntry.type] }}
              >
                {planTypeLabels[selectedEntry.type]}
              </span>
              {editable && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(selectedEntry)}
                    aria-label="Bearbeiten"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedEntry)}
                    aria-label="Löschen"
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ausgewählter Tag ohne Eintrag */}
      {selectedDate && !selectedEntry && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {selectedDate.toLocaleDateString("de-AT", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            –{" "}
            {getHolidayName(fmt(selectedDate)) ??
              (selectedDate.getDay() === 0 || selectedDate.getDay() === 6
                ? "Wochenende"
                : "kein Eintrag vorhanden")}
            .
          </p>
          {editable && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => openNewModal(selectedDate)}>
              Eintrag hinzufügen
            </Button>
          )}
        </div>
      )}

      {/* Monatsübersicht als Liste – am Handy viel besser lesbar als die Kacheln */}
      {abschnitte.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white/70 overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Überblick {firstOfMonth.toLocaleDateString("de-AT", { month: "long" })}
          </p>
          <ul className="divide-y divide-gray-100">
            {abschnitte.map((a) => {
              const h = heute();
              const laeuftHeute = h >= a.von && h <= a.bis;
              return (
                <li key={`${a.entry.id}-${a.von.getTime()}`}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(a.von, a.entry)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 ${
                      laeuftHeute ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <span
                      className="w-1.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: planTypeBarColors[a.entry.type] }}
                    />
                    <span className="w-[88px] shrink-0 text-xs font-semibold text-gray-500 tabular-nums">
                      {zeitraum(a)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800 truncate">
                        {a.entry.details || planTypeLabels[a.entry.type]}
                      </span>
                      {a.entry.location && (
                        <span className="block text-xs text-gray-500 truncate">{a.entry.location}</span>
                      )}
                    </span>
                    {laeuftHeute && (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-blue-700">Jetzt</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Legende: nur Typen, die in diesem Monat vorkommen */}
      {genutzteTypen.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
          {genutzteTypen.map((type) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: planTypeBarColors[type] }}
              />
              {planTypeLabels[type] ?? type}
            </span>
          ))}
        </div>
      )}

      {editable && personalnummer && (
        <PlanEntryEditModal
          key={`${modalEntry?.id ?? "neu"}-${modalPrefillDate ?? ""}-${modalOpen ? "offen" : "zu"}`}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEntry(null);
            setSelectedDate(null);
            onDataChanged?.();
          }}
          entry={modalEntry}
          prefillDate={modalPrefillDate}
          personalnummer={personalnummer}
          lehrlingName={lehrlingName ?? ""}
          lehrjahr={lehrjahr ?? 1}
          standort={standort ?? ""}
        />
      )}
    </div>
  );
}

function PlanEntryEditModal({
  isOpen,
  onClose,
  entry,
  prefillDate,
  personalnummer,
  lehrlingName,
  lehrjahr,
  standort,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: PlanEntry | null;
  prefillDate: string | null;
  personalnummer: string;
  lehrlingName: string;
  lehrjahr: number;
  standort: string;
}) {
  const [startDate, setStartDate] = useState(entry?.startDate ?? prefillDate ?? "");
  const [endDate, setEndDate] = useState(entry?.endDate ?? prefillDate ?? "");
  const [type, setType] = useState<string>(entry?.type ?? "grundlagen");
  const [location, setLocation] = useState(entry?.location ?? standort);
  const [details, setDetails] = useState(entry?.details ?? "");
  const planTypeLabels = getMergedLabels();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate.trim() || !endDate.trim()) {
      toast.error("Bitte Start- und Enddatum im Format TT.MM.JJJJ angeben.");
      return;
    }
    if (!parseDate(startDate) || !parseDate(endDate)) {
      toast.error("Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.");
      return;
    }

    const alle = DataStore.getPlanData();
    let ok: boolean;

    if (entry) {
      ok = await DataStore.setPlanDataAwaited(
        alle.map((e) =>
          e.id === entry.id
            ? { ...e, startDate, endDate, type, location, details: details || planTypeLabels[type] }
            : e,
        ),
      );
    } else {
      const neuerEintrag: PlanEntry = {
        id: `manuell-${Date.now()}`,
        personalnummer,
        lehrlingName,
        lehrjahr,
        startDate,
        endDate,
        location,
        type,
        details: details || planTypeLabels[type],
      };
      ok = await DataStore.setPlanDataAwaited([...alle, neuerEintrag]);
    }

    if (ok) {
      toast.success(entry ? "Eintrag aktualisiert" : "Eintrag hinzugefügt");
      onClose();
    } else {
      toast.error("Speichern fehlgeschlagen - siehe Konsole (F12)");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
      subtitle={lehrlingName}
      icon={<Plus size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bis</label>
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="TT.MM.JJJJ"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input"
          >
            {Object.entries(planTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ort</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. Linz, Wien, St. Martin"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Details (optional, sonst wird der Typ-Name verwendet)
          </label>
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Freitext-Beschreibung"
            className="input"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {entry ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
