import { useState } from "react";
import { RefreshCcw, Trash2, CalendarX2, Archive, Database } from "lucide-react";
import { toast } from "sonner";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { isSupabaseConfigured } from "../lib/supabase";

export function AdminDatenManagementTab() {
  const [busy, setBusy] = useState(false);
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

  function handleBackup() {
    DataStore.createBackup();
    toast.success("Backup erstellt.");
  }

  return (
    <div className="space-y-4">
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
