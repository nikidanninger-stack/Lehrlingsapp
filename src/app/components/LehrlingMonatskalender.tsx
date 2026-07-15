import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PlanEntry, PlanEntryType } from "../types";
import { planTypeLabels, planTypeHexColors } from "./ui/TypeBadge";
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

const planTypeBarColors = planTypeHexColors;

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

export function LehrlingMonatskalender({
  planData,
  editable = false,
  personalnummer,
  lehrlingName,
  lehrjahr,
  standort,
  onDataChanged,
}: LehrlingMonatskalenderProps) {
  const [anchor, setAnchor] = useState(() => new Date(2026, 8, 1));
  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntry, setModalEntry] = useState<PlanEntry | null>(null);
  const [modalPrefillDate, setModalPrefillDate] = useState<string | null>(null);

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
    setSelectedDate(null);
  }

  function goToToday() {
    setAnchor(new Date());
    setSelectedEntry(null);
    setSelectedDate(null);
  }

  function handleDayClick(date: Date, entry: PlanEntry | null) {
    if (entry) {
      setSelectedEntry(entry);
      setSelectedDate(null);
    } else if (editable) {
      setSelectedDate(date);
      setSelectedEntry(null);
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

  function handleDelete(entry: PlanEntry) {
    if (!confirm(`Eintrag "${entry.details}" wirklich löschen?`)) return;
    const alle = DataStore.getPlanData();
    DataStore.setPlanData(alle.filter((e) => e.id !== entry.id));
    setSelectedEntry(null);
    toast.success("Eintrag gelöscht");
    onDataChanged?.();
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
              onClick={() => handleDayClick(date, entry)}
              className={`aspect-square sm:aspect-[4/3] rounded-lg border p-1.5 flex flex-col items-start justify-start text-left transition-all ${
                isToday
                  ? "border-blue-400 ring-2 ring-blue-200"
                  : holidayName
                    ? "border-red-100"
                    : isWeekend
                      ? "border-gray-100"
                      : "border-gray-200"
              } ${entry || editable ? "hover:shadow-md cursor-pointer" : "cursor-default"}`}
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

      {/* Detail-Panel für ausgewählten Tag mit Eintrag */}
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
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-xs text-white font-medium rounded-full px-3 py-1"
                style={{ backgroundColor: planTypeBarColors[selectedEntry.type] }}
              >
                {planTypeLabels[selectedEntry.type]}
              </span>
              {editable && (
                <>
                  <button
                    onClick={() => openEditModal(selectedEntry)}
                    aria-label="Bearbeiten"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedEntry)}
                    aria-label="Löschen"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel für ausgewählten leeren Tag (nur editierbar) */}
      {editable && selectedDate && !selectedEntry && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/50 p-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {selectedDate.toLocaleDateString("de-AT", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            – kein Eintrag vorhanden.
          </p>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => openNewModal(selectedDate)}>
            Eintrag hinzufügen
          </Button>
        </div>
      )}

      {/* Legende */}
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

      {editable && personalnummer && (
        <PlanEntryEditModal
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
  const [type, setType] = useState<PlanEntryType>(entry?.type ?? "grundlagen");
  const [location, setLocation] = useState(entry?.location ?? standort);
  const [details, setDetails] = useState(entry?.details ?? "");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
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

    if (entry) {
      DataStore.setPlanData(
        alle.map((e) =>
          e.id === entry.id
            ? { ...e, startDate, endDate, type, location, details: details || planTypeLabels[type] }
            : e,
        ),
      );
      toast.success("Eintrag aktualisiert");
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
      DataStore.setPlanData([...alle, neuerEintrag]);
      toast.success("Eintrag hinzugefügt");
    }
    onClose();
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
