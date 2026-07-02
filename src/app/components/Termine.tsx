import { useEffect, useState } from "react";
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import type { Termin, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { formatDateLong, parseDate } from "../utils/dateUtils";

interface TermineProps {
  user: User;
}

const TYPE_LABELS: Record<Termin["type"], string> = {
  berufsschule: "Berufsschule",
  schulung: "Schulung",
  ausflug: "Ausflug",
  "prüfung": "Prüfung",
};

const TYPE_COLORS: Record<Termin["type"], string> = {
  berufsschule: "bg-blue-100 text-blue-800 border-blue-200",
  schulung: "bg-purple-100 text-purple-800 border-purple-200",
  ausflug: "bg-pink-100 text-pink-800 border-pink-200",
  "prüfung": "bg-red-100 text-red-800 border-red-200",
};

export function Termine({ user }: TermineProps) {
  const [, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Termin | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";
  const alle = DataStore.getTermine();
  const relevante = isAdmin
    ? alle
    : alle.filter((t) => t.lehrjahre.includes(user.lehrjahr));

  const today = new Date();
  const kommende = relevante
    .filter((t) => {
      const d = parseDate(t.date);
      return d && d >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
    })
    .sort((a, b) => (parseDate(a.date)!.getTime() - parseDate(b.date)!.getTime()));
  const vergangene = relevante
    .filter((t) => {
      const d = parseDate(t.date);
      return d && d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    })
    .sort((a, b) => (parseDate(b.date)!.getTime() - parseDate(a.date)!.getTime()));

  function handleDelete(id: number) {
    if (!confirm("Diesen Termin wirklich löschen?")) return;
    DataStore.deleteTermin(id);
    toast.success("Termin gelöscht");
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(termin: Termin) {
    setEditing(termin);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<CalendarClock size={22} />}
          title="Termine"
          subtitle={isAdmin ? "Alle Schulungen, Ausflüge und Prüfungen verwalten" : "Deine anstehenden Termine"}
          actions={
            isAdmin ? (
              <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={openNew}>
                Neuer Termin
              </Button>
            ) : undefined
          }
        />
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Anstehend</h3>
            {kommende.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Keine anstehenden Termine.
              </p>
            ) : (
              <div className="space-y-3">
                {kommende.map((termin) => (
                  <TerminCard
                    key={termin.id}
                    termin={termin}
                    isAdmin={isAdmin}
                    expanded={expandedId === termin.id}
                    onToggle={() =>
                      setExpandedId(expandedId === termin.id ? null : termin.id)
                    }
                    onEdit={() => openEdit(termin)}
                    onDelete={() => handleDelete(termin.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {vergangene.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Vergangen</h3>
              <div className="space-y-3 opacity-60">
                {vergangene.slice(0, 5).map((termin) => (
                  <TerminCard
                    key={termin.id}
                    termin={termin}
                    isAdmin={isAdmin}
                    expanded={expandedId === termin.id}
                    onToggle={() =>
                      setExpandedId(expandedId === termin.id ? null : termin.id)
                    }
                    onEdit={() => openEdit(termin)}
                    onDelete={() => handleDelete(termin.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {isAdmin && (
        <TerminFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          termin={editing}
        />
      )}
    </div>
  );
}

function TerminCard({
  termin,
  isAdmin,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  termin: Termin;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[termin.type]}`}
            >
              {TYPE_LABELS[termin.type]}
            </span>
            <span className="text-xs text-gray-400">
              Lehrjahr {termin.lehrjahre.join(", ")}
            </span>
          </div>
          <h4 className="font-semibold text-gray-800">{termin.title}</h4>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarClock size={13} /> {formatDateLong(termin.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} /> {termin.time} Uhr
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} /> {termin.location}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={onEdit}
                aria-label="Bearbeiten"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={onDelete}
                aria-label="Löschen"
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
          {(termin.description || termin.items.length > 0) && (
            <button
              onClick={onToggle}
              aria-label={expanded ? "Details einklappen" : "Details anzeigen"}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {termin.description && (
            <p className="text-sm text-gray-600">{termin.description}</p>
          )}
          {termin.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Mitzubringen:</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                {termin.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TerminFormModal({
  isOpen,
  onClose,
  termin,
}: {
  isOpen: boolean;
  onClose: () => void;
  termin: Termin | null;
}) {
  const [title, setTitle] = useState(termin?.title ?? "");
  const [date, setDate] = useState(termin?.date ?? "");
  const [time, setTime] = useState(termin?.time ?? "");
  const [location, setLocation] = useState(termin?.location ?? "");
  const [type, setType] = useState<Termin["type"]>(termin?.type ?? "schulung");
  const [description, setDescription] = useState(termin?.description ?? "");
  const [itemsText, setItemsText] = useState(termin?.items.join("\n") ?? "");
  const [lehrjahre, setLehrjahre] = useState<number[]>(termin?.lehrjahre ?? [1, 2, 3, 4]);

  useEffect(() => {
    setTitle(termin?.title ?? "");
    setDate(termin?.date ?? "");
    setTime(termin?.time ?? "");
    setLocation(termin?.location ?? "");
    setType(termin?.type ?? "schulung");
    setDescription(termin?.description ?? "");
    setItemsText(termin?.items.join("\n") ?? "");
    setLehrjahre(termin?.lehrjahre ?? [1, 2, 3, 4]);
  }, [termin, isOpen]);

  function toggleLehrjahr(jahr: number) {
    setLehrjahre((prev) =>
      prev.includes(jahr) ? prev.filter((j) => j !== jahr) : [...prev, jahr].sort(),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date.trim() || !location.trim()) {
      toast.error("Bitte Titel, Datum und Ort ausfüllen.");
      return;
    }
    const items = itemsText
      .split("\n")
      .map((i) => i.trim())
      .filter(Boolean);

    if (termin) {
      DataStore.updateTermin(termin.id, {
        title,
        date,
        time,
        location,
        type,
        description,
        items,
        lehrjahre,
      });
      toast.success("Termin aktualisiert");
    } else {
      DataStore.addTermin({
        id: Date.now(),
        title,
        date,
        time,
        location,
        type,
        description,
        items,
        lehrjahre,
      });
      toast.success("Termin erstellt");
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={termin ? "Termin bearbeiten" : "Neuer Termin"}
      icon={<CalendarClock size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Titel">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="z.B. Berufsschulblock 3"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <input
              type="text"
              placeholder="DD.MM.YYYY"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Uhrzeit">
            <input
              type="text"
              placeholder="HH:MM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Ort">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input"
            placeholder="z.B. Wien"
          />
        </Field>

        <Field label="Typ">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Termin["type"])}
            className="input"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Beschreibung">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[80px]"
          />
        </Field>

        <Field label="Mitzubringen (eine Zeile pro Punkt)">
          <textarea
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            className="input min-h-[70px]"
            placeholder={"Arbeitskleidung\nSchreibzeug"}
          />
        </Field>

        <Field label="Lehrjahre">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((jahr) => (
              <label
                key={jahr}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                  lehrjahre.includes(jahr)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={lehrjahre.includes(jahr)}
                  onChange={() => toggleLehrjahr(jahr)}
                  className="sr-only"
                />
                LJ {jahr}
              </label>
            ))}
          </div>
        </Field>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {termin ? "Speichern" : "Termin erstellen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
