import { useMemo } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import type { PlanEntry, User } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { TypeBadge } from "./ui/TypeBadge";
import { formatDateLong, parseDate } from "../utils/dateUtils";

// ----------------------------------------------------------------------------
// LehrlingTermineUebersicht
//
// Zeigt automatisch, chronologisch geordnet, ALLE bevorstehenden Abschnitte
// aus dem persönlichen Ausbildungsplan des Lehrlings (nicht nur den nächsten).
// Aufeinanderfolgende Wochenblöcke mit demselben Typ (z.B. drei Wochen "KT St.
// Martin" hintereinander) werden zu EINEM zusammenhängenden Eintrag verschmolzen,
// z.B. "KT St. Martin 14.09.–02.10." statt drei einzelner Wochenzeilen.
// ----------------------------------------------------------------------------

interface LehrlingTermineUebersichtProps {
  user: User;
}

interface MergedSegment {
  type: PlanEntry["type"];
  details: string;
  location: string;
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
}

// Zusammenhängende Segmente gleichen Typs verschmelzen, sofern die Lücke
// zwischen zwei Segmenten höchstens ein paar Tage beträgt (deckt Wochenenden
// und kurze Feiertagslücken ab, ohne inhaltlich unterschiedliche spätere
// Abschnitte fälschlich zusammenzuziehen).
const MAX_GAP_DAYS = 4;

function mergeAdjacentSegments(
  sorted: { entry: PlanEntry; start: Date; end: Date }[],
): MergedSegment[] {
  const merged: MergedSegment[] = [];

  for (const { entry, start, end } of sorted) {
    const last = merged[merged.length - 1];
    const gapDays = last
      ? Math.round((start.getTime() - last.end.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    if (last && last.type === entry.type && gapDays <= MAX_GAP_DAYS) {
      // An bestehendes Segment anhängen, falls es tatsächlich später endet
      if (end > last.end) {
        last.end = end;
        last.endDate = entry.endDate;
      }
    } else {
      merged.push({
        type: entry.type,
        details: entry.details,
        location: entry.location,
        start,
        end,
        startDate: entry.startDate,
        endDate: entry.endDate,
      });
    }
  }

  return merged;
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

    return mergeAdjacentSegments(relevante);
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
            {bevorstehend.map((segment, idx) => {
              const isCurrent = segment.start <= today && today <= segment.end;
              const sameDay = segment.startDate === segment.endDate;
              return (
                <div
                  key={`${segment.startDate}-${idx}`}
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
                      <TypeBadge type={segment.type} />
                      {isCurrent && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          Aktuell
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">{segment.details}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {sameDay
                        ? formatDateLong(segment.startDate)
                        : `${formatDateLong(segment.startDate)} – ${formatDateLong(segment.endDate)}`}
                    </p>
                    {segment.location && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin size={12} /> {segment.location}
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
