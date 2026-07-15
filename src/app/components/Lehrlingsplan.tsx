import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import type { User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { AusbildungsplanMatrix } from "./AusbildungsplanMatrix";
import { LehrlingMonatskalender } from "./LehrlingMonatskalender";

interface LehrlingsplanProps {
  user: User;
}

export function Lehrlingsplan({ user }: LehrlingsplanProps) {
  const [, setTick] = useState(0);
  const isAdmin = user.role === "admin";
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">(
    isAdmin ? "alle" : user.lehrjahr,
  );
  const [personalnummerInput, setPersonalnummerInput] = useState("");
  const [suchePersonalnummer, setSuchePersonalnummer] = useState("");

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const alleLehrlinge = DataStore.getLehrlinge();
  const allePlanEntries = DataStore.getPlanData();

  const gefundenerLehrling = useMemo(
    () => DataStore.findLehrling(suchePersonalnummer.trim()),
    [suchePersonalnummer],
  );

  // ---- Lehrling-Ansicht: eigener Monatskalender, nicht editierbar ----
  if (!isAdmin) {
    const eigenePlanEntries = allePlanEntries.filter(
      (e) => e.personalnummer === user.personalnummer,
    );
    return (
      <div className="space-y-4">
        <GlassCard>
          <SectionHeader
            icon={<CalendarDays size={22} />}
            title="Lehrlingsplan"
            subtitle={`Dein Ausbildungsplan – Lehrjahr ${user.lehrjahr}`}
          />
          <div className="p-6">
            <LehrlingMonatskalender planData={eigenePlanEntries} />
          </div>
        </GlassCard>
      </div>
    );
  }

  // ---- Admin-Ansicht: Personalnummer-Suche mit editierbarem Kalender + breite Matrix ----
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSuchePersonalnummer(personalnummerInput.trim());
  }

  const gefilterteLehrlinge = alleLehrlinge.filter((l) => {
    if (lehrjahrFilter !== "alle" && l.lehrjahr !== lehrjahrFilter) return false;
    return true;
  });

  const relevantePersonalnummern = new Set(gefilterteLehrlinge.map((l) => l.personalnummer));
  const gefiltertePlanEntries = allePlanEntries.filter((e) =>
    relevantePersonalnummern.has(e.personalnummer),
  );

  return (
    <div className="space-y-4">
      {/* Personalnummer-Suche mit editierbarem Monatskalender */}
      <GlassCard>
        <SectionHeader
          icon={<Search size={22} />}
          title="Einzelnen Lehrling bearbeiten"
          subtitle="Personalnummer eingeben, um den Plan im Kalender zu bearbeiten"
        />
        <div className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={personalnummerInput}
              onChange={(e) => setPersonalnummerInput(e.target.value)}
              placeholder="Personalnummer eingeben, z.B. 0016"
              className="input flex-1"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Suchen
            </button>
          </form>

          {suchePersonalnummer && !gefundenerLehrling && (
            <p className="text-sm text-gray-400 text-center py-4">
              Kein Lehrling mit Personalnummer "{suchePersonalnummer}" gefunden.
            </p>
          )}

          {gefundenerLehrling && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {gefundenerLehrling.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{gefundenerLehrling.name}</p>
                  <p className="text-xs text-gray-500">
                    Personalnummer {gefundenerLehrling.personalnummer} · Lehrjahr{" "}
                    {gefundenerLehrling.lehrjahr}
                    {gefundenerLehrling.standort ? ` · ${gefundenerLehrling.standort}` : ""}
                  </p>
                </div>
              </div>
              <LehrlingMonatskalender
                key={gefundenerLehrling.personalnummer}
                planData={allePlanEntries.filter(
                  (e) => e.personalnummer === gefundenerLehrling.personalnummer,
                )}
                editable
                personalnummer={gefundenerLehrling.personalnummer}
                lehrlingName={gefundenerLehrling.name}
                lehrjahr={gefundenerLehrling.lehrjahr}
                standort={gefundenerLehrling.standort ?? ""}
                onDataChanged={() => setTick((t) => t + 1)}
              />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Breite Matrix-Übersicht aller Lehrlinge */}
      <GlassCard>
        <SectionHeader
          icon={<CalendarDays size={22} />}
          title="Lehrlingsplan"
          subtitle="Ausbildungsplan aller Lehrlinge"
        />
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["alle", 1, 2, 3, 4] as const).map((jahr) => (
              <button
                key={jahr}
                onClick={() => setLehrjahrFilter(jahr)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  lehrjahrFilter === jahr
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {jahr === "alle" ? "Alle Lehrjahre" : `Lehrjahr ${jahr}`}
              </button>
            ))}
          </div>

          {gefilterteLehrlinge.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Keine Lehrlinge für diese Auswahl gefunden.
            </p>
          ) : (
            <AusbildungsplanMatrix
              lehrlinge={gefilterteLehrlinge}
              planData={gefiltertePlanEntries}
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
