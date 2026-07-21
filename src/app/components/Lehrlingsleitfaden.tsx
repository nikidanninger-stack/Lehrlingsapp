import { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import type { LeitfadenEintrag, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { LeitfadenChatbot } from "./LeitfadenChatbot";

interface LehrlingsleitfadenProps {
  user: User;
}

export function Lehrlingsleitfaden({ user }: LehrlingsleitfadenProps) {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeitfadenEintrag | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";
  const alle = DataStore.getLeitfadenEintraege();

  const relevante = alle.filter((e) => {
    const matchesLehrjahr = isAdmin || e.lehrjahre.length === 0 || e.lehrjahre.includes(user.lehrjahr);
    const matchesSearch =
      e.titel.toLowerCase().includes(search.toLowerCase()) ||
      e.kategorie.toLowerCase().includes(search.toLowerCase());
    return matchesLehrjahr && matchesSearch;
  });

  const kategorien = Array.from(new Set(relevante.map((e) => e.kategorie)));

  async function handleDelete(id: string) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    const ok = await DataStore.deleteLeitfadenEintragAwaited(id);
    if (ok) {
      toast.success("Eintrag gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen - siehe Konsole (F12)");
    }
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(e: LeitfadenEintrag) {
    setEditing(e);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<BookOpen size={22} />}
          title="Lehrlingsleitfaden"
          subtitle="Verhaltensregeln, Sicherheit & Wissenswertes"
          actions={
            isAdmin ? (
              <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={openNew}>
                Eintrag hinzufügen
              </Button>
            ) : undefined
          }
        />
        <div className="p-6 space-y-8">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titel oder Kategorie suchen..."
              className="input pl-9"
            />
          </div>

          {relevante.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Keine Einträge gefunden.
            </p>
          ) : (
            kategorien.map((kategorie) => (
              <div key={kategorie}>
                {/* Hauptkapitel-Überschrift: deutlich hervorgehoben */}
                <div className="mb-3 pb-2 border-b-2 border-blue-600">
                  <h3 className="text-lg font-bold text-blue-800">{kategorie}</h3>
                </div>
                <div className="space-y-2">
                  {relevante
                    .filter((e) => e.kategorie === kategorie)
                    .map((eintrag) => {
                      const expanded = expandedId === eintrag.id;
                      return (
                        <div
                          key={eintrag.id}
                          className="rounded-xl border border-gray-200 bg-white/60 overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedId(expanded ? null : eintrag.id)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                          >
                            <span className="font-medium text-gray-800 text-sm">
                              {eintrag.titel}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isAdmin && (
                                <>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(eintrag);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                                  >
                                    <Pencil size={13} />
                                  </span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(eintrag.id);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                  >
                                    <Trash2 size={13} />
                                  </span>
                                </>
                              )}
                              {expanded ? (
                                <ChevronUp size={16} className="text-gray-400" />
                              ) : (
                                <ChevronDown size={16} className="text-gray-400" />
                              )}
                            </div>
                          </button>
                          {expanded && (
                            <div
                              className="px-4 pb-4 text-sm text-gray-600 prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: eintrag.inhalt }}
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {isAdmin && (
        <LeitfadenFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          eintrag={editing}
        />
      )}

      <LeitfadenChatbot />
    </div>
  );
}

function LeitfadenFormModal({
  isOpen,
  onClose,
  eintrag,
}: {
  isOpen: boolean;
  onClose: () => void;
  eintrag: LeitfadenEintrag | null;
}) {
  const [titel, setTitel] = useState(eintrag?.titel ?? "");
  const [kategorie, setKategorie] = useState(eintrag?.kategorie ?? "");
  const [inhalt, setInhalt] = useState(eintrag?.inhalt ?? "");
  const [lehrjahre, setLehrjahre] = useState<number[]>(eintrag?.lehrjahre ?? [1, 2, 3, 4]);
  const [sortierung, setSortierung] = useState(eintrag?.sortierung ?? 0);

  useEffect(() => {
    setTitel(eintrag?.titel ?? "");
    setKategorie(eintrag?.kategorie ?? "");
    setInhalt(eintrag?.inhalt ?? "");
    setLehrjahre(eintrag?.lehrjahre ?? [1, 2, 3, 4]);
    setSortierung(eintrag?.sortierung ?? 0);
  }, [eintrag, isOpen]);

  function toggleLehrjahr(jahr: number) {
    setLehrjahre((prev) =>
      prev.includes(jahr) ? prev.filter((j) => j !== jahr) : [...prev, jahr].sort(),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim() || !kategorie.trim()) {
      toast.error("Bitte Titel und Kategorie ausfüllen.");
      return;
    }

    let ok: boolean;
    if (eintrag) {
      ok = await DataStore.updateLeitfadenEintragAwaited(eintrag.id, {
        titel,
        kategorie,
        inhalt,
        lehrjahre,
        sortierung,
      });
    } else {
      ok = await DataStore.addLeitfadenEintragAwaited({
        id: crypto.randomUUID(),
        titel,
        kategorie,
        inhalt,
        lehrjahre,
        wichtig: false,
        sortierung,
      });
    }

    if (ok) {
      toast.success(eintrag ? "Eintrag aktualisiert" : "Eintrag hinzugefügt");
    } else {
      toast.error("Konnte nicht gespeichert werden - siehe Konsole (F12)");
      return;
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eintrag ? "Eintrag bearbeiten" : "Eintrag hinzufügen"}
      icon={<BookOpen size={20} />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label>
            <input value={titel} onChange={(e) => setTitel(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorie (Hauptkapitel)</label>
            <input
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              className="input"
              placeholder="z.B. Regelung Arbeitszeiten Lehrlinge"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Inhalt (HTML wird gerendert)
          </label>
          <textarea
            value={inhalt}
            onChange={(e) => setInhalt(e.target.value)}
            className="input min-h-[140px] font-mono text-xs"
            placeholder="<p>Text mit <strong>HTML</strong>-Formatierung...</p>"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lehrjahre</label>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4].map((jahr) => (
                <label
                  key={jahr}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sortierung
            </label>
            <input
              type="number"
              value={sortierung}
              onChange={(e) => setSortierung(Number(e.target.value))}
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {eintrag ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
