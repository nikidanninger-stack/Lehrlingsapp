import { useState } from "react";
import { RefreshCcw, Trash2, CalendarX2, Archive, Database, UploadCloud, UserCog } from "lucide-react";
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
      const vorhandeneLehrlinge = DataStore.getLehrlinge();
      const vorhandenePlanEintraege = DataStore.getPlanData();
      if (vorhandeneLehrlinge.length > 0 || vorhandenePlanEintraege.length > 0) {
        toast.error(
          "Abgebrochen: Es sind bereits Lehrlinge/Plandaten vorhanden. Dieser Button würde ALLE " +
            "eure manuellen Korrekturen (Feiertage, geänderte Tage usw.) unwiderruflich überschreiben " +
            "und ist nur für eine erstmalige, leere Datenbank gedacht. Falls wirklich ein kompletter " +
            "Reset gewünscht ist, bitte zuerst Rücksprache halten.",
        );
        return;
      }
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
        `${mod.SEED_ANSPRECHPARTNER.length} Ansprechpartner, ${mod.SEED_LEITFADEN.length} Leitfaden-Einträge und ${mod.SEED_LERNABSCHNITTE.length} Lernmodule importiert und gespeichert. (Werkzeuge werden hier bewusst NICHT mehr angerührt - siehe Hinweis.)`,
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

  async function handleImportGeburtsdaten() {
    try {
      const { gesetzt, nichtGefunden } = await DataStore.importGeburtsdaten();
      if (nichtGefunden.length === 0) {
        toast.success(`${gesetzt} Geburtsdaten gespeichert.`);
      } else {
        toast.success(
          `${gesetzt} Geburtsdaten gespeichert. ${nichtGefunden.length} Namen nicht gefunden: ${nichtGefunden.join(", ")}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import fehlgeschlagen");
    }
  }

  async function handleTestaccountErstellen() {
    try {
      await DataStore.erstelleTestaccountAwaited();
      toast.success("Test-Account 9999 (EAKON Team) angelegt/aktualisiert.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anlegen fehlgeschlagen");
    }
  }

  async function handleWerkzeugFotosReparieren() {
    try {
      const { gesetzt, keinFotoVorhanden } = await DataStore.repariereWerkzeugFotos();
      if (keinFotoVorhanden.length === 0) {
        toast.success(`${gesetzt} Werkzeug-Fotos wiederhergestellt.`);
      } else {
        toast.success(
          `${gesetzt} Werkzeug-Fotos wiederhergestellt. ${keinFotoVorhanden.length} Werkzeuge ohne passendes Foto: ${keinFotoVorhanden.join(", ")}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reparatur fehlgeschlagen");
    }
  }

  function handleBackup() {
    DataStore.createBackup();
    toast.success("Backup erstellt.");
  }

  function handleBackupExportieren() {
    const backup = DataStore.getBackup();
    if (!backup) {
      toast.error("Kein Backup im Browser-Speicher gefunden.");
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lehrlingsapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const zeitpunkt = (backup as any).timestamp;
    toast.success(
      zeitpunkt
        ? `Backup heruntergeladen (erstellt am ${new Date(zeitpunkt).toLocaleString("de-AT")}).`
        : "Backup heruntergeladen.",
    );
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
          Nur für die erstmalige, leere Datenbank gedacht. Lädt die 59 Lehrlinge und den
          kompletten Ausbildungsplan 2026/2027. Sobald bereits Daten vorhanden sind (also
          praktisch immer im laufenden Betrieb), <strong>tut dieser Button nichts mehr</strong> -
          so können eure manuellen Korrekturen (Feiertage, geänderte Tage usw.) nie mehr aus
          Versehen überschrieben werden.
        </p>
        <Button onClick={handleManualSeed} disabled={seeding} icon={<UploadCloud size={16} />}>
          {seeding ? "Wird importiert…" : "Jetzt importieren"}
        </Button>
      </GlassCard>

      <GlassCard className="p-6 border-2 border-purple-300">
        <div className="flex items-center gap-2 mb-1">
          <UploadCloud size={18} className="text-purple-600" />
          <h3 className="font-bold text-gray-800">
            Ansprechpartner, Leitfaden &amp; LernApp importieren
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Lädt 4 Ansprechpartner, alle Leitfaden-Kapitel sowie die LernApp-Module
          (Allgemeine Kältetechnik &amp; Verdichter) direkt in die App. Bestehende
          Einträge in diesen Bereichen werden überschrieben.{" "}
          <strong>Werkzeuge werden hier bewusst NICHT importiert</strong> - dafür
          gibt es die echten, mit Fotos versehenen Werkzeuge direkt in der
          Datenbank, die hierdurch nicht mehr überschrieben werden können.
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
          icon={<CalendarX2 size={16} />}
          title="Geburtsdaten importieren"
          description="Trägt die Geburtsdaten aus der Excel-Liste bei allen passenden Lehrlingen ein (per Namensabgleich)."
          buttonLabel="Importieren"
          onClick={handleImportGeburtsdaten}
        />
        <ActionRow
          icon={<UserCog size={16} />}
          title="Test-Account (9999) anlegen"
          description="Legt einen Demo-Lehrling 'EAKON Team' (Personalnummer 9999) mit gefülltem Beispiel-Kalender und Beispiel-To-Dos an - zum Weiterschicken, z.B. für eine Bewerbung/Präsentation."
          buttonLabel="Anlegen"
          onClick={handleTestaccountErstellen}
        />
        <ActionRow
          icon={<UserCog size={16} />}
          title="Werkzeug-Fotos reparieren"
          description="Stellt die Bild-URLs der Werkzeuge anhand der ursprünglichen Datei-Zuordnung wieder her (Fotos liegen weiterhin im Speicher, nur die Verknüpfung fehlte)."
          buttonLabel="Reparieren"
          onClick={handleWerkzeugFotosReparieren}
        />
        <ActionRow
          icon={<Archive size={16} />}
          title="Backup erstellen"
          description="Sichert alle aktuellen Daten lokal (übersteht ein Leeren des Caches nicht)."
          buttonLabel="Backup erstellen"
          onClick={handleBackup}
        />
        <ActionRow
          icon={<Archive size={16} />}
          title="Vorhandenes Backup herunterladen"
          description="Lädt ein eventuell bereits vorhandenes Backup als Datei herunter, OHNE es zu überschreiben. Wichtig zum Prüfen, bevor du 'Backup erstellen' erneut klickst."
          buttonLabel="Herunterladen"
          onClick={handleBackupExportieren}
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
