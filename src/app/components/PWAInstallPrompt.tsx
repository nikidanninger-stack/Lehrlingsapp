import { useEffect, useState } from "react";
import { Smartphone, Share, PlusSquare, MoreVertical, Monitor, CheckCircle2 } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";

// ----------------------------------------------------------------------------
// Erkennt die Plattform und zeigt eine passende Installationsanleitung.
// PWAStatusBadge zeigt einen kompakten Indikator (z.B. in der Ecke des Profils).
// ----------------------------------------------------------------------------

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstallState() {
  const [installed, setInstalled] = useState(isRunningStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return { installed, deferredPrompt };
}

export function PWAStatusBadge() {
  const { installed } = usePwaInstallState();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        installed
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${installed ? "bg-green-500" : "bg-blue-500"}`} />
      {installed ? "Installiert" : "Installierbar"}
    </span>
  );
}

export function PWAInstallPrompt() {
  const platform = detectPlatform();
  const { installed, deferredPrompt } = usePwaInstallState();

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt as unknown as {
      prompt: () => Promise<void>;
    };
    await promptEvent.prompt();
  }

  if (installed) {
    return (
      <GlassCard className="p-6 flex items-center gap-3">
        <CheckCircle2 size={24} className="text-green-500" />
        <div>
          <p className="font-semibold text-gray-800">App ist bereits installiert</p>
          <p className="text-sm text-gray-500">
            Du nutzt die LehrlingsApp bereits als installierte App.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone size={20} className="text-blue-600" />
        <h3 className="font-bold text-gray-800">App installieren</h3>
      </div>

      {platform === "ios" && (
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              1
            </span>
            <span className="flex items-center gap-1.5">
              Tippe unten in Safari auf <Share size={14} className="inline text-blue-600" />{" "}
              <strong>Teilen</strong>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              2
            </span>
            <span className="flex items-center gap-1.5">
              Wähle <PlusSquare size={14} className="inline text-blue-600" />{" "}
              <strong>Zum Home-Bildschirm</strong>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              3
            </span>
            <span>Bestätige mit <strong>Hinzufügen</strong></span>
          </li>
        </ol>
      )}

      {platform === "android" && (
        <div className="space-y-4">
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <span className="flex items-center gap-1.5">
                Tippe oben rechts auf <MoreVertical size={14} className="inline text-blue-600" />
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <span>Wähle <strong>Zum Startbildschirm hinzufügen</strong></span>
            </li>
          </ol>
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Jetzt installieren
            </button>
          )}
        </div>
      )}

      {platform === "desktop" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Monitor size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p>
              Klicke in der Adressleiste deines Browsers auf das Installations-Symbol
              (meist ein Bildschirm-Icon rechts im URL-Feld) und bestätige die Installation.
            </p>
          </div>
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Jetzt installieren
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
