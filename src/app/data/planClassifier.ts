import type { PlanEntry, PlanEntryType } from "../types";

// ----------------------------------------------------------------------------
// reclassifyPlanEntry
//
// Analysiert `details` und `location` eines PlanEntry per Keywords und
// bestimmt automatisch den passenden `type`. Reihenfolge der Prüfung ist
// bewusst so gewählt wie in der Spezifikation (Priorität von oben nach unten).
// ----------------------------------------------------------------------------

function norm(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

export function reclassifyPlanEntry(
  entry: Pick<PlanEntry, "details" | "location">,
): PlanEntryType {
  const details = norm(entry.details);
  const location = norm(entry.location);
  const combined = `${details} ${location}`;

  if (combined.includes("betriebsurlaub") || combined.includes("urlaub")) {
    return "betriebsurlaub";
  }
  if (combined.includes("lehrlingsausflug") || combined.includes("ausflug")) {
    return "lehrlingsausflug";
  }
  if (combined.includes("werkstatt") && combined.includes("st. martin")) {
    return "werkstatt-st-martin";
  }
  if (combined.includes("grundlagen") || combined.includes("grundschulung")) {
    return "grundlagen";
  }
  if (combined.includes("vorbereitung") && combined.includes("berufsschule")) {
    return "berufsschule-vorbereitung";
  }
  if (combined.includes("testlabor") || combined.includes("labor")) {
    return "testlabor";
  }
  if (combined.includes("berufsschule") && combined.includes("kälte")) {
    return "berufsschule-kaelte";
  }
  if (combined.includes("berufsschule") && combined.includes("elektro")) {
    return "berufsschule-elektro";
  }
  if (
    combined.includes("berufsschule") ||
    combined.includes("schule") ||
    /\bbs\b/.test(combined)
  ) {
    return "berufsschule";
  }
  if (combined.includes("service")) {
    return "service";
  }
  if (
    (combined.includes("montage") || combined.includes("kt/et") || combined.includes("kt / et")) &&
    combined.includes("linz")
  ) {
    return "montage-kt-et-linz";
  }
  if (
    (combined.includes("montage") || combined.includes("kt/et") || combined.includes("kt / et")) &&
    combined.includes("wien")
  ) {
    return "montage-kt-et-wien";
  }
  if (combined.includes("werkzeug")) {
    return "werkzeugpruefung";
  }
  if (combined.includes("schulung")) {
    return "schulung";
  }

  // Fallback: bestehenden Typ als "grundlagen" markieren, wenn nichts passt
  return "grundlagen";
}

export function reclassifyEntries(entries: PlanEntry[]): PlanEntry[] {
  return entries.map((entry) => ({
    ...entry,
    type: reclassifyPlanEntry(entry),
  }));
}
