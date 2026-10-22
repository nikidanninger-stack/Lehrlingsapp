import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  ensurePushSubscriptionSilently,
  isPushSupported,
  requestPushPermissionAndSubscribe,
} from "../data/pushNotifications";
import { Button } from "./ui/Button";

// ----------------------------------------------------------------------------
// PushPflichtDialog
//
// Nach dem Login müssen Lehrlinge die Benachrichtigungen aktivieren, damit sie
// z.B. erfahren, wenn ihre SEG-Zulage / Privat-KM in der Zeiterfassung
// genehmigt oder abgelehnt wurde, und die Stundenzettel-Erinnerung bekommen.
// Das Handy erlaubt das nur nach einem Tipp des Benutzers – deshalb dieser
// Dialog (ohne "Überspringen").
//
// - Erlaubnis noch offen  → Pflicht-Dialog mit "Benachrichtigungen aktivieren"
// - Erlaubnis abgelehnt   → Anleitung zum Wiedereinschalten + "Weiter"
// - iPhone im Browser     → Anleitung "Zum Home-Bildschirm" + "Weiter"
// - Erlaubnis schon da    → Abo still nachspeichern, kein Dialog
// Deaktivieren geht weiterhin im Profil.
// ----------------------------------------------------------------------------

type Mode = "ask" | "denied" | "ios" | null;

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

interface PushPflichtDialogProps {
  personalnummer: string;
}

export function PushPflichtDialog({ personalnummer }: PushPflichtDialogProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!personalnummer) return;
    if (!isPushSupported || !("Notification" in window)) {
      setMode(isIOS() && !isStandalone() ? "ios" : null);
      return;
    }
    if (Notification.permission === "granted") {
      void ensurePushSubscriptionSilently(personalnummer);
      setMode(null);
      return;
    }
    setMode(Notification.permission === "denied" ? "denied" : "ask");
  }, [personalnummer]);

  if (!mode) return null;

  async function handleActivate() {
    setBusy(true);
    const result = await requestPushPermissionAndSubscribe(personalnummer);
    setBusy(false);
    if (result === "granted") {
      toast.success("Benachrichtigungen aktiviert!");
      setMode(null);
    } else if (result === "denied") {
      setMode("denied");
    } else {
      toast.error("Benachrichtigungen konnten nicht aktiviert werden.");
      // Nicht blockieren, wenn es technisch nicht geht
      setMode(null);
    }
  }

  const content = {
    ask: {
      icon: <Bell size={36} />,
      title: "Benachrichtigungen aktivieren",
      text: (
        <>
          Damit du erfährst, wenn deine <b>SEG-Zulage</b> oder deine <b>Privat-KM</b> genehmigt
          oder abgelehnt wurde, und an den Stundenzettel erinnert wirst, aktiviere bitte die
          Benachrichtigungen.
          <br />
          <br />
          Tippe gleich danach im Fenster des Handys auf <b>„Erlauben“</b>.
        </>
      ),
    },
    denied: {
      icon: <BellOff size={36} />,
      title: "Benachrichtigungen sind blockiert",
      text: (
        <>
          Du hast Benachrichtigungen für diese App abgelehnt. So schaltest du sie wieder ein:
          <br />
          <br />
          <b>Android/Chrome:</b> neben der Adresse auf das Schloss-Symbol → Berechtigungen →
          Benachrichtigungen → Zulassen.
          <br />
          <b>iPhone:</b> Einstellungen → Mitteilungen → LehrlingsApp → Mitteilungen erlauben.
          <br />
          <br />
          Danach die App neu öffnen.
        </>
      ),
    },
    ios: {
      icon: <Smartphone size={36} />,
      title: "App zum Home-Bildschirm hinzufügen",
      text: (
        <>
          Auf dem iPhone funktionieren Benachrichtigungen nur, wenn die App installiert ist:
          <br />
          <br />
          1. Unten auf <b>Teilen</b> (Viereck mit Pfeil) tippen
          <br />
          2. <b>„Zum Home-Bildschirm“</b> wählen
          <br />
          3. Die App über das neue Symbol öffnen und Benachrichtigungen aktivieren.
        </>
      ),
    },
  }[mode];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-pflicht-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          {content.icon}
        </div>
        <h3 id="push-pflicht-title" className="text-lg font-bold text-gray-800 mb-3">
          {content.title}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed text-left">{content.text}</p>
        <div className="mt-5">
          {mode === "ask" ? (
            <Button className="w-full" icon={<Bell size={16} />} onClick={handleActivate} disabled={busy}>
              {busy ? "Bitte im Fenster „Erlauben“ tippen…" : "Benachrichtigungen aktivieren"}
            </Button>
          ) : (
            <Button className="w-full" variant="ghost" onClick={() => setMode(null)}>
              Verstanden, weiter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
