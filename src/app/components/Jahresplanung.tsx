import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { AusbildungsplanMatrix } from "./AusbildungsplanMatrix";

export function Jahresplanung() {
  const [, setTick] = useState(0);
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">("alle");
  const [standortFilter, setStandortFilter] = useState<string>("alle");

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const alleLehrlinge = DataStore.getLehrlinge();
  const allePlanEntries = DataStore.getPlanData();

  const standorte = Array.from(
    new Set(alleLehrlinge.map((l) => l.standort).filter(Boolean)),
  ) as string[];

  const gefilterteLehrlinge = alleLehrlinge.filter((l) => {
    if (lehrjahrFilter !== "alle" && l.lehrjahr !== lehrjahrFilter) return false;
    if (standortFilter !== "alle" && l.standort !== standortFilter) return false;
    return true;
  });

  const relevantePersonalnummern = new Set(gefilterteLehrlinge.map((l) => l.personalnummer));
  const gefiltertePlanEntries = allePlanEntries.filter((e) =>
    relevantePersonalnummern.has(e.personalnummer),
  );

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<BarChart3 size={22} />}
          title="Jahresplanung"
          subtitle="Ganzjährige Übersicht aller Planeinträge – September bis August"
        />
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
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

            <select
              value={standortFilter}
              onChange={(e) => setStandortFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="alle">Alle Standorte</option>
              {standorte.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
