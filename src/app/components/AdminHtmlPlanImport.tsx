import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { DataStore } from "../data/store";
import { planTypeHexColors } from "./ui/TypeBadge";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import type { PlanEntry } from "../types";

// ----------------------------------------------------------------------------
// Import des Ausbildungsplans aus der HTML-Planungsdatei (dem eigenständigen
// Tool, das parallel zur App in Excel/HTML gepflegt wird).
//
// Funktionsweise: Die HTML-Datei rendert pro Tag/Lehrling eine <td class="dc">
// Zelle mit einem "title"-Attribut ("YYYY-MM-DD – Name") und einer
// Hintergrundfarbe. Diese Farben sind 1:1 dieselben Hex-Werte wie
// planTypeHexColors in der App - deshalb kann jede Zelle automatisch der
// richtigen Kategorie zugeordnet werden, ohne dass Namen/Keys manuell
// gemappt werden müssen. Personen werden per (word-order-unabhängigem)
// Namensabgleich den existierenden Lehrlingen in der App zugeordnet.
// ----------------------------------------------------------------------------

function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Umlaute/Akzente einebnen für robusteren Abgleich
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

interface ImportErgebnis {
  eintraegeGesamt: number;
  eintraegeUebernommen: number;
  personenGefunden: number;
  personenNichtGefunden: string[];
  betroffenePersonalnummern: number;
}

export function AdminHtmlPlanImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErgebnis(null);
    try {
      const htmlText = await file.text();

      // AP_DEFAULT (Personenliste) aus dem eingebetteten JS extrahieren
      const apMatch = htmlText.match(/const AP_DEFAULT\s*=\s*(\[[\s\S]*?\]);/);
      if (!apMatch) {
        throw new Error(
          "Konnte die Personenliste (AP_DEFAULT) in der Datei nicht finden. Ist das die richtige HTML-Datei?",
        );
      }
      const apList: { lj: string; name: string; beruf: string; standort: string }[] = JSON.parse(
        apMatch[1],
      );

      // rgb(...) -> PlanEntryType key, aus den bekannten App-Farben
      const rgbToType = new Map<string, string>();
      for (const [type, hex] of Object.entries(planTypeHexColors)) {
        rgbToType.set(hexToRgbString(hex), type);
      }

      // Aktuelle Lehrlinge der App laden, für den Namensabgleich
      const lehrlinge = DataStore.getLehrlinge();
      const lehrlingByNormalizedName = new Map(
        lehrlinge.map((l) => [normalizeName(l.name), l]),
      );

      const personIndexToLehrling = new Map<number, (typeof lehrlinge)[number]>();
      const nichtGefunden: string[] = [];
      apList.forEach((p, idx) => {
        const treffer = lehrlingByNormalizedName.get(normalizeName(p.name));
        if (treffer) {
          personIndexToLehrling.set(idx, treffer);
        } else {
          nichtGefunden.push(p.name);
        }
      });

      // HTML parsen und alle Tages-Zellen auslesen
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      const zellen = doc.querySelectorAll<HTMLTableCellElement>("td.dc");

      const neueEintraegeProPersonalnummer = new Map<string, PlanEntry[]>();
      let eintraegeGesamt = 0;

      zellen.forEach((td) => {
        const aiAttr = td.getAttribute("data-ai");
        const title = td.getAttribute("title");
        if (aiAttr === null || !title) return;
        const ai = parseInt(aiAttr, 10);
        const lehrling = personIndexToLehrling.get(ai);
        if (!lehrling) return;

        const isoDate = title.split(" – ")[0]?.trim();
        const isoMatch = isoDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!isoMatch) return;
        const dateStr = `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;

        const bg = td.style.backgroundColor;
        if (!bg) return;
        const type = rgbToType.get(bg);
        if (!type) return; // z.B. leer/weiß, oder Feiertag/Sa/So (die berechnet die App selbst)

        eintraegeGesamt++;
        const eintrag: PlanEntry = {
          id: `htmlimport-${lehrling.personalnummer}-${dateStr}`,
          personalnummer: lehrling.personalnummer,
          lehrlingName: lehrling.name,
          lehrjahr: lehrling.lehrjahr,
          startDate: dateStr,
          endDate: dateStr,
          location: lehrling.standort ?? "",
          type,
          details: "",
        };
        const liste = neueEintraegeProPersonalnummer.get(lehrling.personalnummer) ?? [];
        liste.push(eintrag);
        neueEintraegeProPersonalnummer.set(lehrling.personalnummer, liste);
      });

      const betroffenePersonalnummern = new Set(neueEintraegeProPersonalnummer.keys());
      if (betroffenePersonalnummern.size === 0) {
        throw new Error(
          "Keine passenden Einträge gefunden. Bitte prüfen, ob es wirklich die aktuelle Planungs-HTML-Datei ist.",
        );
      }

      // Nur die Einträge der GEFUNDENEN Personen ersetzen, alle anderen
      // (nicht in der HTML enthaltenen) Lehrlinge/Einträge bleiben unangetastet.
      const alleAktuellenEintraege = DataStore.getPlanData();
      const behalten = alleAktuellenEintraege.filter(
        (e) => !betroffenePersonalnummern.has(e.personalnummer),
      );
      const neueGesamtliste = [
        ...behalten,
        ...Array.from(neueEintraegeProPersonalnummer.values()).flat(),
      ];

      const ok = await DataStore.setPlanDataAwaited(neueGesamtliste);
      if (!ok) {
        throw new Error("Speichern fehlgeschlagen. Details in der Browser-Konsole.");
      }

      const res: ImportErgebnis = {
        eintraegeGesamt,
        eintraegeUebernommen: Array.from(neueEintraegeProPersonalnummer.values()).flat().length,
        personenGefunden: personIndexToLehrling.size,
        personenNichtGefunden: nichtGefunden,
        betroffenePersonalnummern: betroffenePersonalnummern.size,
      };
      setErgebnis(res);
      toast.success(
        `Ausbildungsplan aktualisiert: ${res.eintraegeUebernommen} Tage für ${res.betroffenePersonalnummern} Lehrlinge übernommen.`,
      );
    } catch (err) {
      console.error("HTML-Import fehlgeschlagen:", err);
      toast.error(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <GlassCard className="p-6 border-2 border-emerald-300">
      <div className="flex items-center gap-2 mb-1">
        <UploadCloud size={18} className="text-emerald-600" />
        <h3 className="font-bold text-gray-800">Ausbildungsplan aus HTML-Datei aktualisieren</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Lade hier die aktuelle, exportierte Planungs-HTML-Datei hoch (die, die du in Excel/dem
        Planungstool bearbeitest). Nur die Tage der darin enthaltenen Lehrlinge werden ersetzt -
        alles andere bleibt unverändert. Feiertage/Wochenenden werden automatisch von der App
        berechnet und nicht aus der Datei übernommen.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        icon={<UploadCloud size={16} />}
      >
        {busy ? "Importiere..." : "HTML-Datei auswählen und importieren"}
      </Button>

      {ergebnis && (
        <div className="mt-4 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1">
          <p>
            <strong>{ergebnis.eintraegeUebernommen}</strong> Tage-Einträge für{" "}
            <strong>{ergebnis.betroffenePersonalnummern}</strong> Lehrlinge übernommen.
          </p>
          {ergebnis.personenNichtGefunden.length > 0 && (
            <p className="text-amber-700">
              Nicht gefunden (Name kommt in der App nicht vor, wurden übersprungen):{" "}
              {ergebnis.personenNichtGefunden.join(", ")}
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
