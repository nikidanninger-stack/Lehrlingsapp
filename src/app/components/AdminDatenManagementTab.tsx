import { useState } from "react";
import { RefreshCcw, Trash2, CalendarX2, Archive, Database, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { isSupabaseConfigured } from "../lib/supabase";

export function AdminDatenManagementTab() {
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedingContent, setSeedingContent] = useState(false);
  const [diagnose, setDiagnose] = useState<string[] | null>(null);
  const lastUpload = DataStore.getLastUpload();

  async function handleReload() {
    setBusy(true);
    try {
      await DataStore.loadFromSupabase();
      await DataStore.loadLernAbschnitteFromSupabase();
      toast.success("Daten neu von Supabase geladen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSeed() {
    setSeeding(true);
    try {
      const mod = await import("../data/seedData");
      await DataStore.importSeedDataAwaited(mod.SEED_LEHRLINGE, mod.SEED_PLAN_DATA);
      DataStore.setLastUpload({
        date: new Date().toISOString(),
        fileName: "Lehrlingsplan_2026_2027.html (manueller Import)",
      });
      toast.success(
        `${mod.SEED_LEHRLINGE.length} Lehrlinge und ${mod.SEED_PLAN_DATA.length} Plan-Einträge importiert und gespeichert.`,
      );
    } catch (err) {
      console.error("Seed-Import fehlgeschlagen:", err);
      toast.error(
        `Import fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSeeding(false);
    }
  }

  async function handleManualContentSeed() {
    setSeedingContent(true);
    try {
      const mod = await import("../data/seedContentData");

      const seedIds = new Set(mod.SEED_LERNABSCHNITTE.map((a) => a.id));
      const bestehende = DataStore.getLernAbschnitte().filter((a) => !seedIds.has(a.id));
      const alleLernAbschnitte = [...bestehende, ...mod.SEED_LERNABSCHNITTE];

      await DataStore.importContentSeedAwaited(
        mod.SEED_ANSPRECHPARTNER,
        mod.SEED_WERKZEUGE,
        mod.SEED_LEITFADEN,
        alleLernAbschnitte,
      );

      toast.success(
        `${mod.SEED_ANSPRECHPARTNER.length} Ansprechpartner, ${mod.SEED_WERKZEUGE.length} Werkzeuge, ${mod.SEED_LEITFADEN.length} Leitfaden-Einträge und ${mod.SEED_LERNABSCHNITTE.length} Lernmodule importiert und gespeichert.`,
      );
    } catch (err) {
      console.error("Content-Seed-Import fehlgeschlagen:", err);
      toast.error(
        `Import fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSeedingContent(false);
    }
  }

  function handleClearCache() {
    if (!confirm("Lokalen Cache wirklich leeren? Nicht synchronisierte Änderungen gehen verloren.")) {
      return;
    }
    DataStore.clearLocalCache();
    toast.success("Lokaler Cache geleert.");
  }

  function handleCleanupWeekends() {
    const removed = DataStore.cleanupWochenendeLocal();
    toast.success(
      removed > 0
        ? `${removed} Wochenend-Einträge entfernt.`
        : "Keine Wochenend-Einträge gefunden.",
    );
  }

  async function handleCorrectHolidays() {
    const { removedWrongFeiertag, removedWorkOnHoliday } = await DataStore.correctHolidays();
    if (removedWrongFeiertag === 0 && removedWorkOnHoliday === 0) {
      toast.success("Feiertage sind bereits korrekt.");
    } else {
      toast.success(
        `Korrigiert: ${removedWrongFeiertag} falsche Feiertags-Markierungen entfernt, ${removedWorkOnHoliday} Werktags-Einträge an echten Feiertagen entfernt.`,
      );
    }
  }

  function handleBackup() {
    DataStore.createBackup();
    toast.success("Backup erstellt.");
  }

  function handleDiagnose() {
    const raw = localStorage.getItem("lehrlingsapp_plan_data");
    if (!raw) {
      setDiagnose(["Kein 'lehrlingsapp_plan_data' im LocalStorage gefunden."]);
      return;
    }
    const parsed = JSON.parse(raw) as Array<{
      personalnummer: string;
      startDate: string;
      endDate: string;
      type: string;
      details: string;
    }>;
    const relevant = parsed
      .filter(
        (e) =>
          e.personalnummer === "0016" &&
          (e.startDate.includes(".06.2027") ||
            e.startDate.includes(".07.2027") ||
            e.endDate.includes(".06.2027") ||
            e.endDate.includes(".07.2027")),
      )
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    setDiagnose(
      relevant.length > 0
        ? relevant.map((e) => `${e.startDate} – ${e.endDate} | ${e.type} | ${e.details}`)
        : ["Keine Einträge für 0016 im Juni/Juli 2027 gefunden."],
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-6 border-2 border-blue-300">
        <div className="flex items-center gap-2 mb-1">
          <UploadCloud size={18} className="text-blue-600" />
          <h3 className="font-bold text-gray-800">
            Lehrlinge &amp; Ausbildungsplan importieren
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Lädt die 59 Lehrlinge und den kompletten Ausbildungsplan 2026/2027 direkt in
          die App. Bestehende Lehrlinge/Plandaten werden dabei überschrieben.
        </p>
        <Button onClick={handleManualSeed} disabled={seeding} icon={<UploadCloud size={16} />}>
          {seeding ? "Wird importiert…" : "Jetzt importieren"}
        </Button>
      </GlassCard>

      <GlassCard className="p-6 border-2 border-purple-300">
        <div className="flex items-center gap-2 mb-1">
          <UploadCloud size={18} className="text-purple-600" />
          <h3 className="font-bold text-gray-800">
            Ansprechpartner, Werkzeuge, Leitfaden &amp; LernApp importieren
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Lädt 4 Ansprechpartner, den vollständigen Werkzeugkatalog, alle
          Leitfaden-Kapitel sowie die LernApp-Module (Allgemeine Kältetechnik &amp;
          Verdichter) direkt in die App. Bestehende Einträge in diesen Bereichen
          werden überschrieben.
        </p>
        <Button
          onClick={handleManualContentSeed}
          disabled={seedingContent}
          icon={<UploadCloud size={16} />}
          variant="secondary"
        >
          {seedingContent ? "Wird importiert…" : "Jetzt importieren"}
        </Button>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Database size={18} className="text-blue-600" />
          <h3 className="font-bold text-gray-800">Supabase-Sync-Status</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {isSupabaseConfigured
            ? "Supabase ist konfiguriert. Daten werden im Hintergrund synchronisiert."
            : "Supabase ist noch nicht konfiguriert – die App läuft im reinen Offline-Modus. Trage VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in die .env ein."}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isSupabaseConfigured
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSupabaseConfigured ? "bg-green-500" : "bg-amber-500"
            }`}
          />
          {isSupabaseConfigured ? "Verbunden" : "Offline-Modus"}
        </span>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-bold text-gray-800 mb-1">Letzter Upload</h3>
        {lastUpload ? (
          <p className="text-sm text-gray-500">
            {lastUpload.fileName} –{" "}
            {new Date(lastUpload.date).toLocaleString("de-AT")}
          </p>
        ) : (
          <p className="text-sm text-gray-400">Noch kein Ausbildungsplan hochgeladen.</p>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-bold text-gray-800 mb-1">
          Diagnose: Jan de Kruijff (0016) Juni/Juli 2027
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Zeigt exakt, was im Browser-Speicher für diesen Zeitraum hinterlegt ist.
        </p>
        <Button size="sm" variant="ghost" onClick={handleDiagnose}>
          Prüfen
        </Button>
        {diagnose && (
          <div className="mt-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1 max-h-64 overflow-y-auto">
            {diagnose.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <h3 className="font-bold text-gray-800 mb-1">Aktionen</h3>

        <ActionRow
          icon={<RefreshCcw size={16} />}
          title="Alle Daten neu von Supabase laden"
          description="Lädt Lehrlinge, Plandaten und Lernabschnitte erneut vom Server."
          buttonLabel="Neu laden"
          onClick={handleReload}
          busy={busy}
        />
        <ActionRow
          icon={<CalendarX2 size={16} />}
          title="Wochenende-Einträge bereinigen"
          description="Entfernt versehentlich importierte Samstag-/Sonntag-Einträge."
          buttonLabel="Bereinigen"
          onClick={handleCleanupWeekends}
        />
        <ActionRow
          icon={<CalendarX2 size={16} />}
          title="Feiertage korrigieren"
          description="Behebt falsch übernommene bewegliche Feiertage (Ostermontag, Christi Himmelfahrt, Pfingstmontag, Fronleichnam) für alle Jahre - entfernt Feiertags-Markierungen an echten Werktagen und Werktags-Einträge an echten Feiertagen."
          buttonLabel="Korrigieren"
          onClick={handleCorrectHolidays}
        />
        <ActionRow
          icon={<Archive size={16} />}
          title="Backup erstellen"
          description="Sichert alle aktuellen Daten lokal (übersteht ein Leeren des Caches nicht)."
          buttonLabel="Backup erstellen"
          onClick={handleBackup}
        />
        <ActionRow
          icon={<Trash2 size={16} />}
          title="Lokalen Cache leeren"
          description="Setzt alle lokal gespeicherten Daten zurück. Nicht synchronisierte Änderungen gehen verloren."
          buttonLabel="Cache leeren"
          onClick={handleClearCache}
          danger
        />
      </GlassCard>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  busy,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-t border-gray-100 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant={danger ? "danger" : "ghost"}
        onClick={onClick}
        disabled={busy}
        className="shrink-0"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
