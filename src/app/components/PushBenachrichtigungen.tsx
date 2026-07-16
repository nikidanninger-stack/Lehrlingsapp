import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  getCurrentPushStatus,
  requestPushPermissionAndSubscribe,
  unsubscribeFromPush,
} from "../data/pushNotifications";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";

// ----------------------------------------------------------------------------
// PushBenachrichtigungen
//
// Zeigt den aktuellen Push-Status und erlaubt es dem Nutzer, Erinnerungen
// (z.B. Stundenzettel am Monatsletzten) zu aktivieren oder zu deaktivieren.
// Wird im Profil-Bereich angezeigt.
// ----------------------------------------------------------------------------

interface PushBenachrichtigungenProps {
  personalnummer: string;
}

export function PushBenachrichtigungen({ personalnummer }: PushBenachrichtigungenProps) {
  const [status, setStatus] = useState<
    "loading" | "granted" | "denied" | "default" | "not-supported"
  >("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentPushStatus().then(setStatus);
  }, []);

  async function handleActivate() {
    setBusy(true);
    const result = await requestPushPermissionAndSubscribe(personalnummer);
    setBusy(false);

    if (result === "granted") {
      setStatus("granted");
      toast.success("Benachrichtigungen aktiviert!");
    } else if (result === "denied") {
      setStatus("denied");
      toast.error(
        "Berechtigung wurde abgelehnt. Du kannst sie in den Geräteeinstellungen wieder erlauben.",
      );
    } else if (result === "not-supported") {
      toast.error(
        "Dein Gerät/Browser unterstützt keine Push-Benachrichtigungen. Auf iPhone: Füge die App zuerst zum Home-Bildschirm hinzu.",
      );
    } else {
      toast.error("Benachrichtigungen konnten nicht aktiviert werden.");
    }
  }

  async function handleDeactivate() {
    setBusy(true);
    await unsubscribeFromPush();
    setBusy(false);
    setStatus("default");
    toast.success("Benachrichtigungen deaktiviert.");
  }

  if (status === "loading") return null;

  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {status === "granted" ? <BellRing size={18} /> : <Bell size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">
            Erinnerungen (z.B. Stundenzettel)
          </p>
          {status === "not-supported" && (
            <p className="text-xs text-gray-500 mt-0.5">
              Dein Browser unterstützt keine Push-Benachrichtigungen. Auf dem
              iPhone: Füge die App über "Zum Home-Bildschirm" hinzu und öffne
              sie von dort erneut.
            </p>
          )}
          {status === "denied" && (
            <p className="text-xs text-gray-500 mt-0.5">
              Du hast Benachrichtigungen abgelehnt. Um sie wieder zu
              aktivieren, musst du das in den Geräteeinstellungen für diese
              App erlauben.
            </p>
          )}
          {status === "default" && (
            <p className="text-xs text-gray-500 mt-0.5">
              Erhalte automatisch eine Erinnerung am Monatsletzten, deinen
              Stundenzettel auszufüllen.
            </p>
          )}
          {status === "granted" && (
            <p className="text-xs text-green-700 mt-0.5">
              Aktiv – du bekommst automatisch eine Erinnerung am
              Monatsletzten.
            </p>
          )}
          <div className="mt-3">
            {status === "granted" ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<BellOff size={14} />}
                onClick={handleDeactivate}
                disabled={busy}
              >
                Deaktivieren
              </Button>
            ) : (
              <Button
                size="sm"
                icon={<Bell size={14} />}
                onClick={handleActivate}
                disabled={busy || status === "not-supported"}
              >
                Aktivieren
              </Button>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
