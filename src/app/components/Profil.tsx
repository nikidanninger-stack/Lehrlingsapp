import { LogOut, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import type { User } from "../types";
import { DataStore } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { ProgressBar } from "./ui/ProgressBar";
import { Button } from "./ui/Button";
import { PWAInstallPrompt, PWAStatusBadge } from "./PWAInstallPrompt";

interface ProfilProps {
  user: User;
  onLogout: () => void;
}

export function Profil({ user, onLogout }: ProfilProps) {
  const lehrling = DataStore.findLehrling(user.personalnummer);
  const isAdmin = user.role === "admin";

  const gesamtfortschritt = isAdmin
    ? 0
    : DataStore.getGesamtfortschritt(user.personalnummer, user.lehrjahr);
  const abschnitte = isAdmin
    ? []
    : DataStore.getLernAbschnitte().filter((a) => a.lehrjahr === user.lehrjahr);
  const fortschritte = DataStore.getLernFortschritte().filter(
    (f) => f.personalnummer === user.personalnummer,
  );
  const abgeschlossenCount = fortschritte.filter((f) => f.abgeschlossen).length;
  const letzteAktivitaet = fortschritte
    .map((f) => f.letzteAktivitaet)
    .sort()
    .reverse()[0];

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-4">
      {/* Profilkarte */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? "Administrator" : `Personalnummer: ${user.personalnummer}`}
            </p>
            {!isAdmin && (
              <p className="text-sm text-gray-500">
                Lehrjahr {user.lehrjahr}
                {lehrling?.standort ? ` · ${lehrling.standort}` : ""}
              </p>
            )}
          </div>
          <PWAStatusBadge />
        </div>
      </GlassCard>

      {/* Lernstatistiken (nur Lehrling) */}
      {!isAdmin && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-800">Lernstatistiken</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">Gesamtfortschritt</span>
                <span className="font-semibold text-gray-800">{gesamtfortschritt}%</span>
              </div>
              <ProgressBar value={gesamtfortschritt} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3 bg-white/50 rounded-xl p-3">
                <CheckCircle2 size={20} className="text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {abgeschlossenCount}/{abschnitte.length}
                  </p>
                  <p className="text-xs text-gray-500">Abgeschlossen</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/50 rounded-xl p-3">
                <Clock size={20} className="text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {letzteAktivitaet
                      ? new Date(letzteAktivitaet).toLocaleDateString("de-AT")
                      : "–"}
                  </p>
                  <p className="text-xs text-gray-500">Letzte Aktivität</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* PWA-Installation */}
      <PWAInstallPrompt />

      {/* Abmelden */}
      <Button
        variant="danger"
        icon={<LogOut size={16} />}
        onClick={onLogout}
        className="w-full"
      >
        Abmelden
      </Button>
    </div>
  );
}
