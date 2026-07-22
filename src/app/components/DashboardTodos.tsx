import { useState } from "react";
import { toast } from "sonner";
import { ListChecks, Plus, Trash2, ChevronDown, ChevronRight, Check, Repeat } from "lucide-react";
import type { Lehrling, Todo } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";

function aktuellerMonat(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonat(monat: string): string {
  const [jahr, mon] = monat.split("-").map(Number);
  if (!jahr || !mon) return monat;
  return new Date(jahr, mon - 1, 1).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
}

// Ist ein To-Do in einem bestimmten Monat aktiv? Einmalige To-Dos nur in
// ihrem eigenen Monat, laufende (wiederholtSichMonatlich) ab ihrem Startmonat
// jeden Monat danach.
function istAktivInMonat(todo: Todo, monat: string): boolean {
  if (todo.wiederholtSichMonatlich) return todo.monat <= monat;
  return todo.monat === monat;
}

// ============================================================================
// Für Lehrlinge: eigene To-Dos des aktuellen Monats, zum Abhaken
// ============================================================================

export function LehrlingTodoListe({
  personalnummer,
  lehrjahr,
}: {
  personalnummer: string;
  lehrjahr: number;
}) {
  const monat = aktuellerMonat();
  const alleTodos = DataStore.getTodos();
  const erledigungen = DataStore.getTodoErledigungen();

  const meineTodos = alleTodos.filter(
    (t) => istAktivInMonat(t, monat) && (t.lehrjahr === "alle" || t.lehrjahr === lehrjahr),
  );

  async function handleToggle(todoId: string) {
    const ok = await DataStore.toggleTodoErledigtAwaited(todoId, personalnummer, monat);
    if (!ok) {
      toast.error("Konnte nicht gespeichert werden - siehe Konsole (F12)");
    }
  }

  if (meineTodos.length === 0) return null;

  const erledigtCount = meineTodos.filter((t) =>
    erledigungen.some((e) => e.todoId === t.id && e.personalnummer === personalnummer && e.monat === monat),
  ).length;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ListChecks size={20} className="text-green-600" />
          <h2 className="font-bold text-gray-800">To-Dos · {formatMonat(monat)}</h2>
        </div>
        <span className="text-xs font-semibold text-gray-400">
          {erledigtCount}/{meineTodos.length} erledigt
        </span>
      </div>
      <ul className="space-y-2">
        {meineTodos.map((todo) => {
          const erledigt = erledigungen.some(
            (e) => e.todoId === todo.id && e.personalnummer === personalnummer && e.monat === monat,
          );
          return (
            <li key={todo.id}>
              <label className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                <button
                  type="button"
                  onClick={() => handleToggle(todo.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                    erledigt ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"
                  }`}
                >
                  {erledigt && <Check size={13} className="text-white" strokeWidth={3} />}
                </button>
                <div>
                  <p className={`text-sm ${erledigt ? "text-gray-400 line-through" : "text-gray-700"}`}>
                    {todo.titel}
                    {todo.wiederholtSichMonatlich && (
                      <Repeat size={11} className="inline ml-1.5 text-gray-300" />
                    )}
                  </p>
                  {todo.beschreibung && (
                    <p className="text-xs text-gray-400 mt-0.5">{todo.beschreibung}</p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

// ============================================================================
// Für Admin: To-Dos anlegen/löschen + Übersicht, wer was noch nicht gemacht hat
// ============================================================================

export function AdminTodoVerwaltung({ lehrlinge }: { lehrlinge: Lehrling[] }) {
  const [monat, setMonat] = useState(aktuellerMonat());
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [lehrjahrAuswahl, setLehrjahrAuswahl] = useState<"alle" | number>("alle");
  const [laufend, setLaufend] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [offenTodoId, setOffenTodoId] = useState<string | null>(null);

  const alleTodos = DataStore.getTodos();
  const erledigungen = DataStore.getTodoErledigungen();
  const todosDiesenMonat = alleTodos
    .filter((t) => istAktivInMonat(t, monat))
    .sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm));

  async function handleHinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    setSpeichert(true);
    const ok = await DataStore.addTodoAwaited({
      id: crypto.randomUUID(),
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || undefined,
      monat,
      lehrjahr: lehrjahrAuswahl,
      erstelltAm: new Date().toISOString(),
      wiederholtSichMonatlich: laufend,
    });
    setSpeichert(false);
    if (ok) {
      toast.success(laufend ? "Laufendes To-Do angelegt" : "To-Do angelegt");
      setTitel("");
      setBeschreibung("");
      setLaufend(false);
    } else {
      toast.error("Konnte nicht gespeichert werden - siehe Konsole (F12)");
    }
  }

  async function handleLoeschen(todo: Todo) {
    const hinweis = todo.wiederholtSichMonatlich
      ? `"${todo.titel}" wirklich löschen? Das ist ein LAUFENDES To-Do - es verschwindet dann auch für alle zukünftigen Monate.`
      : `"${todo.titel}" wirklich löschen?`;
    if (!confirm(hinweis)) return;
    const ok = await DataStore.deleteTodoAwaited(todo.id);
    if (ok) {
      toast.success("To-Do gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen - siehe Konsole (F12)");
    }
  }

  function betroffeneLehrlinge(todo: Todo): Lehrling[] {
    return lehrlinge.filter((l) => todo.lehrjahr === "alle" || l.lehrjahr === todo.lehrjahr);
  }

  function nichtErledigt(todo: Todo): Lehrling[] {
    return betroffeneLehrlinge(todo).filter(
      (l) =>
        !erledigungen.some(
          (e) => e.todoId === todo.id && e.personalnummer === l.personalnummer && e.monat === monat,
        ),
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ListChecks size={20} className="text-green-600" />
        <h2 className="font-bold text-gray-800">Monatliche To-Dos</h2>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Monat ansehen</label>
        <input
          type="month"
          value={monat}
          onChange={(e) => setMonat(e.target.value)}
          className="input w-auto"
        />
      </div>

      <form onSubmit={handleHinzufuegen} className="space-y-2 mb-5">
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="To-Do Titel, z.B. Berichtsheft eintragen"
            className="input"
          />
          <input
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Zusatzinfo (optional)"
            className="input"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={lehrjahrAuswahl}
            onChange={(e) => setLehrjahrAuswahl(e.target.value === "alle" ? "alle" : Number(e.target.value))}
            className="input w-auto"
          >
            <option value="alle">Alle Lehrjahre</option>
            <option value={1}>Lehrjahr 1</option>
            <option value={2}>Lehrjahr 2</option>
            <option value={3}>Lehrjahr 3</option>
            <option value={4}>Lehrjahr 4</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={laufend}
              onChange={(e) => setLaufend(e.target.checked)}
              className="accent-green-600"
            />
            Läuft ab {formatMonat(monat)} jeden Monat weiter (ganzjährig)
          </label>
          <button
            type="submit"
            disabled={speichert}
            className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors ml-auto"
          >
            <Plus size={16} /> Hinzufügen
          </button>
        </div>
      </form>

      {todosDiesenMonat.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Noch keine To-Dos für {formatMonat(monat)} angelegt.
        </p>
      ) : (
        <ul className="space-y-2">
          {todosDiesenMonat.map((todo) => {
            const betroffene = betroffeneLehrlinge(todo);
            const offene = nichtErledigt(todo);
            const istOffen = offenTodoId === todo.id;
            return (
              <li key={todo.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOffenTodoId(istOffen ? null : todo.id)}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    {istOffen ? (
                      <ChevronDown size={15} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={15} className="text-gray-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-700 truncate">{todo.titel}</span>
                    {todo.wiederholtSichMonatlich && (
                      <span
                        className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 shrink-0 flex items-center gap-0.5"
                        title={`Laufend seit ${formatMonat(todo.monat)}`}
                      >
                        <Repeat size={9} /> laufend
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
                      {todo.lehrjahr === "alle" ? "Alle LJ" : `LJ ${todo.lehrjahr}`}
                    </span>
                  </button>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      offene.length === 0 ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {betroffene.length - offene.length}/{betroffene.length} erledigt
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoeschen(todo)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    title="To-Do löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {istOffen && (
                  <div className="px-3 pb-3 pt-1 bg-gray-50/70">
                    {todo.beschreibung && (
                      <p className="text-xs text-gray-500 mb-2">{todo.beschreibung}</p>
                    )}
                    {offene.length === 0 ? (
                      <p className="text-xs text-green-600 font-medium">
                        Alle betroffenen Lehrlinge haben erledigt. 🎉
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">
                          Noch nicht erledigt ({offene.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {offene.map((l) => (
                            <span
                              key={l.personalnummer}
                              className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1"
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
