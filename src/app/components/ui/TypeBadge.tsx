import type { PlanEntryType } from "../../types";

export const planTypeLabels: Record<PlanEntryType, string> = {
  grundlagen: "Grundlagen",
  berufsschule: "Berufsschule",
  "berufsschule-kaelte": "BS Kälte",
  "berufsschule-elektro": "BS Elektro",
  service: "Service",
  "montage-kt-et-linz": "Montage Linz",
  "montage-kt-et-wien": "Montage Wien",
  schulung: "Schulung",
  "berufsschule-vorbereitung": "BS Vorbereitung",
  werkzeugpruefung: "Werkzeugprüfung",
  testlabor: "Testlabor",
  betriebsurlaub: "Betriebsurlaub",
  lehrlingsausflug: "Ausflug",
  "werkstatt-st-martin": "Werkstatt St. Martin",
};

export const planTypeColors: Record<PlanEntryType, string> = {
  grundlagen: "bg-green-100 text-green-800 border-green-200",
  berufsschule: "bg-blue-100 text-blue-800 border-blue-200",
  "berufsschule-kaelte": "bg-blue-100 text-blue-800 border-blue-200",
  "berufsschule-elektro": "bg-indigo-100 text-indigo-800 border-indigo-200",
  service: "bg-orange-100 text-orange-800 border-orange-200",
  "montage-kt-et-linz": "bg-red-100 text-red-800 border-red-200",
  "montage-kt-et-wien": "bg-red-100 text-red-800 border-red-200",
  schulung: "bg-purple-100 text-purple-800 border-purple-200",
  "berufsschule-vorbereitung": "bg-yellow-100 text-yellow-800 border-yellow-200",
  werkzeugpruefung: "bg-gray-100 text-gray-800 border-gray-200",
  testlabor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  betriebsurlaub: "bg-emerald-100 text-emerald-800 border-emerald-200",
  lehrlingsausflug: "bg-pink-100 text-pink-800 border-pink-200",
  "werkstatt-st-martin": "bg-amber-100 text-amber-900 border-amber-200",
};

interface TypeBadgeProps {
  type: PlanEntryType;
  className?: string;
}

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${planTypeColors[type]} ${className}`}
    >
      {planTypeLabels[type]}
    </span>
  );
}
