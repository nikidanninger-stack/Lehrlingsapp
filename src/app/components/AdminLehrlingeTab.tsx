import { useState } from "react";
import { Plus, Pencil, Trash2, Search, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Lehrling } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

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
  return `${alter} Jahre`;
}

export function AdminLehrlingeTab() {
  const [, forceUpdate] = useState(0);
  const [search, setSearch] = useState("");
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">("alle");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lehrling | null>(null);

  const alle = DataStore.getLehrlinge();
  const gefiltert = alle.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.personalnummer.includes(search);
    const matchesJahr = lehrjahrFilter === "alle" || l.lehrjahr === lehrjahrFilter;
    return matchesSearch && matchesJahr;
  });

  async function handleDelete(personalnummer: string) {
    if (!confirm("Diesen Lehrling wirklich löschen?")) return;
    const ok = await DataStore.deleteLehrlingAwaited(personalnummer);
    forceUpdate((n) => n + 1);
    if (ok) {
      toast.success("Lehrling gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen - siehe Konsole (F12)");
    }
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(lehrling: Lehrling) {
    setEditing(lehrling);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder Personalnummer suchen..."
              className="input pl-9"
            />
          </div>
          <select
            value={lehrjahrFilter}
            onChange={(e) =>
              setLehrjahrFilter(e.target.value === "alle" ? "alle" : Number(e.target.value))
            }
            className="input w-auto"
          >
            <option value="alle">Alle Lehrjahre</option>
            {[1, 2, 3, 4].map((j) => (
              <option key={j} value={j}>
                Lehrjahr {j}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={openNew}>
          Lehrling hinzufügen
        </Button>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Personalnummer</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Lehrjahr</th>
                <th className="px-4 py-3 font-medium">Standort</th>
                <th className="px-4 py-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Keine Lehrlinge gefunden.
                  </td>
                </tr>
              ) : (
                gefiltert.map((l) => (
                  <tr key={l.personalnummer} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600">{l.personalnummer}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{l.name}</td>
                    <td className="px-4 py-3 text-gray-600">LJ {l.lehrjahr}</td>
                    <td className="px-4 py-3 text-gray-600">{l.standort ?? "–"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(l)}
                          aria-label="Bearbeiten"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(l.personalnummer)}
                          aria-label="Löschen"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <LehrlingFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          forceUpdate((n) => n + 1);
        }}
        lehrling={editing}
      />
    </div>
  );
}

function LehrlingFormModal({
  isOpen,
  onClose,
  lehrling,
}: {
  isOpen: boolean;
  onClose: () => void;
  lehrling: Lehrling | null;
}) {
  const [personalnummer, setPersonalnummer] = useState(lehrling?.personalnummer ?? "");
  const [name, setName] = useState(lehrling?.name ?? "");
  const [lehrjahr, setLehrjahr] = useState(lehrling?.lehrjahr ?? 1);
  const [standort, setStandort] = useState<Lehrling["standort"]>(lehrling?.standort);
  const [kommentar, setKommentar] = useState(lehrling?.kommentar ?? "");
  const [geburtsdatum, setGeburtsdatum] = useState(lehrling?.geburtsdatum ?? "");

  useState(() => {
    setPersonalnummer(lehrling?.personalnummer ?? "");
    setName(lehrling?.name ?? "");
    setLehrjahr(lehrling?.lehrjahr ?? 1);
    setStandort(lehrling?.standort);
    setKommentar(lehrling?.kommentar ?? "");
    setGeburtsdatum(lehrling?.geburtsdatum ?? "");
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personalnummer.trim() || !name.trim()) {
      toast.error("Bitte Personalnummer und Name ausfüllen.");
      return;
    }

    try {
      let ok: boolean;
      if (lehrling) {
        ok = await DataStore.updateLehrlingAwaited(lehrling.personalnummer, {
          name,
          lehrjahr,
          standort,
          kommentar: kommentar.trim() || undefined,
          geburtsdatum: geburtsdatum.trim() || undefined,
        });
      } else {
        ok = await DataStore.addLehrlingAwaited({
          personalnummer,
          name,
          lehrjahr,
          standort,
          kommentar: kommentar.trim() || undefined,
          geburtsdatum: geburtsdatum.trim() || undefined,
        });
      }
      if (ok) {
        toast.success(lehrling ? "Lehrling aktualisiert" : "Lehrling hinzugefügt");
        onClose();
      } else {
        toast.error("Speichern fehlgeschlagen - siehe Konsole (F12)");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lehrling ? "Lehrling bearbeiten" : "Lehrling hinzufügen"}
      icon={<UserCog size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Personalnummer
          </label>
          <input
            value={personalnummer}
            onChange={(e) => setPersonalnummer(e.target.value)}
            disabled={!!lehrling}
            className="input disabled:bg-gray-100 disabled:text-gray-400"
            placeholder="z.B. 12345"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Max Mustermann"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Lehrjahr</label>
          <select
            value={lehrjahr}
            onChange={(e) => setLehrjahr(Number(e.target.value))}
            className="input"
          >
            {[1, 2, 3, 4].map((j) => (
              <option key={j} value={j}>
                Lehrjahr {j}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Standort</label>
          <select
            value={standort ?? ""}
            onChange={(e) =>
              setStandort((e.target.value || undefined) as Lehrling["standort"])
            }
            className="input"
          >
            <option value="">– kein Standort –</option>
            <option value="Wien">Wien</option>
            <option value="Linz">Linz</option>
            <option value="St. Martin">St. Martin</option>
            <option value="Deutschland">Deutschland</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Geburtsdatum</label>
          <input
            value={geburtsdatum}
            onChange={(e) => setGeburtsdatum(e.target.value)}
            className="input"
            placeholder="TT.MM.JJJJ, z.B. 15.03.2008"
          />
          {geburtsdatum.trim() && berechneAlter(geburtsdatum) && (
            <p className="text-xs text-gray-500 mt-1">Aktuelles Alter: {berechneAlter(geburtsdatum)}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Kommentar</label>
          <textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            className="input"
            rows={2}
            placeholder="Freie Notiz zu diesem Lehrling..."
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {lehrling ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
