import { useMemo } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import type { PlanEntry, User } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { TypeBadge } from "./ui/TypeBadge";
import { formatDateLong, parseDate } from "../utils/dateUtils";

interface LehrlingTermineUebersichtProps {
  user: User;
}

export function LehrlingTermineUebersicht({ user }: LehrlingTermineUebersichtProps) {
  const bevorstehend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eigene = DataStore.getPlanDataForLehrling(user.personalnummer);

    const relevante = eigene
      .map((entry) => ({ entry, start: parseDate(entry.startDate), end: parseDate(entry.endDate) }))
      .filter((x): x is { entry: PlanEntry; start: Date; end: Date } => {
        if (!x.start || !x.end) return false;
        return x.end >= today;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return relevante;
  }, [user.personalnummer]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <GlassCard>
      <SectionHeader
        icon={<CalendarClock size={22} />}
        title="Termine"
        subtitle="Deine bevorstehenden Abschnitte im Ausbildungsplan"
      />
      <div className="p-6">
        {bevorstehend.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Für dich sind aktuell keine bevorstehenden Abschnitte hinterlegt.
          </p>
        ) : (
          <div className="space-y-3">
            {bevorstehend.map(({ entry, start, end }, idx) => {
              const isCurrent = start <= today && today <= end;
              const sameDay = entry.startDate === entry.endDate;
              return (
                <div
                  key={`${entry.id}-${idx}`}
                  className={`rounded-xl border p-4 flex items-start gap-4 ${
                    isCurrent
                      ? "border-blue-300 bg-blue-50/60"
                      : "border-gray-200 bg-white/60"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-blue-500/30">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <TypeBadge type={entry.type} />
                      {isCurrent && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Aktuell
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">{entry.details}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {sameDay
                        ? formatDateLong(entry.startDate)
                        : `${formatDateLong(entry.startDate)} – ${formatDateLong(entry.endDate)}`}
                    </p>
                    {entry.location && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin size={12} /> {entry.location}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
