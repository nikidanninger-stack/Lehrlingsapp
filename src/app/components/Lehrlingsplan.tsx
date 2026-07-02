import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
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

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const alleLehrlinge = DataStore.getLehrlinge();
  const allePlanEntries = DataStore.getPlanData();

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
