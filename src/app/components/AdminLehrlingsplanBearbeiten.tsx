import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, User as UserIcon, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { PlanEntry } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TypeBadge, getMergedLabels } from "./ui/TypeBadge";
import { formatDateLong, parseDate } from "../utils/dateUtils";

// ----------------------------------------------------------------------------
// AdminLehrlingsplanBearbeiten
//
// Personalnummer eingeben -> kompletter Ausbildungsplan dieses Lehrlings
// erscheint als Liste. Einzelne Einträge können bearbeitet, gelöscht oder
// neue Einträge hinzugefügt werden.
// ----------------------------------------------------------------------------

export function AdminLehrlingsplanBearbeiten() {
  const [, forceUpdate] = useState(0);
  const [personalnummer, setPersonalnummer] = useState("");
  const [suchePersonalnummer, setSuchePersonalnummer] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanEntry | null>(null);

  const lehrling = useMemo(
    () => DataStore.findLehrling(suchePersonalnummer.trim()),
    [suchePersonalnummer],
  );

  const eintraege = useMemo(() => {
    if (!lehrling) return [];
    return DataStore.getPlanDataForLehrling(lehrling.personalnummer).sort((a, b) => {
      const da = parseDate(a.startDate);
      const db = parseDate(b.startDate);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
  }, [lehrling]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSuchePersonalnummer(personalnummer.trim());
  }

  function handleDelete(entry: PlanEntry) {
    if (!confirm(`Eintrag "${entry.details}" (${entry.startDate} – ${entry.endDate}) wirklich löschen?`)) {
      return;
    }
    const alle = DataStore.getPlanData();
    DataStore.setPlanData(alle.filter((e) => e.id !== entry.id));
    forceUpdate((n) => n + 1);
    toast.success("Eintrag gelöscht");
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(entry: PlanEntry) {
    setEditing(entry);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Search size={18} className="text-blue-600" />
          <h3 className="font-bold text-gray-800">Lehrling suchen</h3>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={personalnummer}
            onChange={(e) => setPersonalnummer(e.target.value)}
            placeholder="Personalnummer eingeben, z.B. 0016"
            className="input flex-1"
          />
          <Button type="submit" icon={<Search size={16} />}>
            Suchen
          </Button>
        </form>
      </GlassCard>

      {suchePersonalnummer && !lehrling && (
        <GlassCard className="p-6">
          <p className="text-sm text-gray-400 text-center">
            Kein Lehrling mit Personalnummer "{suchePersonalnummer}" gefunden.
          </p>
        </GlassCard>
      )}

      {lehrling && (
        <GlassCard>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                <UserIcon size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-800">{lehrling.name}</p>
                <p className="text-xs text-gray-500">
                  Personalnummer {lehrling.personalnummer} · Lehrjahr {lehrling.lehrjahr}
                  {lehrling.standort ? ` · ${lehrling.standort}` : ""}
                </p>
              </div>
            </div>
            <Button size="sm" icon={<Plus size={16} />} onClick={openNew}>
              Eintrag hinzufügen
            </Button>
          </div>

          <div className="p-6">
            {eintraege.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Für diesen Lehrling sind noch keine Plan-Einträge hinterlegt.
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto scroll-thin pr-1">
                {eintraege.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/60 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarDays size={16} className="text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypeBadge type={entry.type} />
                          <span className="text-xs text-gray-400">
                            {formatDateLong(entry.startDate)} – {formatDateLong(entry.endDate)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate mt-0.5">{entry.details}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(entry)}
                        aria-label="Bearbeiten"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        aria-label="Löschen"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {lehrling && (
        <PlanEntryFormModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            forceUpdate((n) => n + 1);
          }}
          entry={editing}
          personalnummer={lehrling.personalnummer}
          lehrlingName={lehrling.name}
          lehrjahr={lehrling.lehrjahr}
          standort={lehrling.standort ?? ""}
        />
      )}
    </div>
  );
}

function PlanEntryFormModal({
  isOpen,
  onClose,
  entry,
  personalnummer,
  lehrlingName,
  lehrjahr,
  standort,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: PlanEntry | null;
  personalnummer: string;
  lehrlingName: string;
  lehrjahr: number;
  standort: string;
}) {
  const [startDate, setStartDate] = useState(entry?.startDate ?? "");
  const [endDate, setEndDate] = useState(entry?.endDate ?? "");
  const [type, setType] = useState<string>(entry?.type ?? "grundlagen");
  const [location, setLocation] = useState(entry?.location ?? standort);
  const [details, setDetails] = useState(entry?.details ?? "");

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
            ? { ...e, startDate, endDate, type, location, details: details || getMergedLabels()[type] }
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
        details: details || getMergedLabels()[type],
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
      icon={<CalendarDays size={20} />}
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
            {Object.entries(getMergedLabels()).map(([value, label]) => (
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
