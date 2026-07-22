import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Medal,
  ArrowRight,
  Stethoscope,
  CalendarDays,
  Bot,
  LayoutDashboard,
} from "lucide-react";
import type { Screen, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { TypeBadge } from "./ui/TypeBadge";
import { LehrlingTodoListe, AdminTodoVerwaltung } from "./DashboardTodos";
import { getGreeting, formatDateLong, daysBetween, parseDate } from "../utils/dateUtils";

interface DashboardProps {
  user: User;
  onNavigate: (screen: Screen) => void;
}

export function Dashboard({ user, onNavigate }: DashboardProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToDataChanges(() => setTick((t) => t + 1));
  }, []);

  if (user.role === "admin") {
    return <AdminDashboard onNavigate={onNavigate} />;
  }
  return <LehrlingDashboard user={user} onNavigate={onNavigate} />;
}

// ============================================================================
// Lehrling-Dashboard
// ============================================================================

function LehrlingDashboard({ user, onNavigate }: DashboardProps) {
  const lehrling = DataStore.findLehrling(user.personalnummer);
  const gesamtfortschritt = DataStore.getGesamtfortschritt(
    user.personalnummer,
    user.lehrjahr,
  );
  const abschnitte = DataStore.getLernAbschnitte().filter(
    (a) => a.lehrjahr === user.lehrjahr,
  );
  const fortschritte = DataStore.getLernFortschritte().filter(
    (f) => f.personalnummer === user.personalnummer,
  );
  const abgeschlossenCount = fortschritte.filter((f) => f.abgeschlossen).length;

  const nextActivity = useMemo(() => {
    const today = new Date();
    const planEntries = DataStore.getPlanDataForLehrling(user.personalnummer)
      .map((e) => ({ entry: e, date: parseDate(e.startDate) }))
      .filter((e) => e.date && e.date >= today)
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()));
    return planEntries[0] ?? null;
  }, [user.personalnummer]);

  const daysToNext = nextActivity?.date
    ? daysBetween(new Date(), nextActivity.date)
    : null;

  const leaderboard = useMemo(() => {
    const all = DataStore.getLehrlinge().filter(
      (l) => l.lehrjahr === user.lehrjahr,
    );
    return all
      .map((l) => ({
        ...l,
        fortschritt: DataStore.getGesamtfortschritt(l.personalnummer, l.lehrjahr),
      }))
      .sort((a, b) => b.fortschritt - a.fortschritt);
  }, [user.lehrjahr]);

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {getGreeting()}, {user.name.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Lehrjahr {user.lehrjahr}
          {lehrling?.standort ? ` | ${lehrling.standort}` : ""}
        </p>
        <p className="text-gray-400 text-xs mt-0.5 capitalize">
          {new Date().toLocaleDateString("de-AT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Lernfortschritt"
          value={`${gesamtfortschritt}%`}
          gradient="from-green-500 to-green-700 shadow-green-500/30"
        />
        <StatCard
          icon={<CalendarClock size={22} />}
          label="Nächster Termin"
          value={daysToNext !== null ? `${daysToNext} Tg.` : "–"}
          gradient="from-blue-500 to-blue-700 shadow-blue-500/30"
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          label="Abgeschlossen"
          value={`${abgeschlossenCount}/${abschnitte.length}`}
          gradient="from-purple-500 to-purple-700 shadow-purple-500/30"
        />
        <StatCard
          icon={<GraduationCap size={22} />}
          label="Lehrjahr"
          value={String(user.lehrjahr)}
          gradient="from-orange-500 to-orange-600 shadow-orange-500/30"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="font-bold text-gray-800">Lernapp Rangliste</h2>
          </div>
          {leaderboard.length === 0 ? (
            <EmptyState text="Noch keine Lehrlinge in deinem Lehrjahr erfasst." />
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((l, idx) => {
                const isMe = l.personalnummer === user.personalnummer;
                return (
                  <li
                    key={l.personalnummer}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                      isMe ? "bg-blue-50 border border-blue-200" : ""
                    }`}
                  >
                    <span className="w-6 text-center font-semibold text-sm text-gray-500">
                      {idx === 0 ? (
                        <Medal size={18} className="text-yellow-500 mx-auto" />
                      ) : idx === 1 ? (
                        <Medal size={18} className="text-gray-400 mx-auto" />
                      ) : idx === 2 ? (
                        <Medal size={18} className="text-amber-700 mx-auto" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={`flex-1 text-sm ${
                        isMe ? "font-semibold text-blue-800" : "text-gray-700"
                      }`}
                    >
                      {l.name} {isMe && "(Du)"}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">
                      {l.fortschritt}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        {/* Nächste Aktivität */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-800">Nächste Aktivität</h2>
          </div>
          {nextActivity ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {formatDateLong(nextActivity.entry.startDate)}
                </span>
                <TypeBadge type={nextActivity.entry.type} />
              </div>
              <p className="text-gray-700 text-sm">{nextActivity.entry.details}</p>
              <p className="text-gray-400 text-xs">{nextActivity.entry.location}</p>
            </div>
          ) : (
            <EmptyState text="Keine bevorstehenden Einträge in deinem Ausbildungsplan." />
          )}
        </GlassCard>
      </div>

      <LehrlingTodoListe personalnummer={user.personalnummer} lehrjahr={user.lehrjahr} />

      {/* Schnellzugriff */}
      <div>
        <h2 className="font-bold text-gray-800 mb-3">Schnellzugriff</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction
            icon={<GraduationCap size={22} />}
            label="Lernapp"
            gradient="from-green-500 to-green-700 shadow-green-500/30"
            onClick={() => onNavigate("lernapp")}
          />
          <QuickAction
            icon={<CalendarClock size={22} />}
            label="Termine"
            gradient="from-blue-500 to-blue-700 shadow-blue-500/30"
            onClick={() => onNavigate("termine")}
          />
          <QuickAction
            icon={<Stethoscope size={22} />}
            label="Krankmeldung"
            gradient="from-red-500 to-red-700 shadow-red-500/30"
            onClick={() => onNavigate("krankmeldung")}
          />
          <QuickAction
            icon={<CalendarDays size={22} />}
            label="Lehrlingsplan"
            gradient="from-purple-500 to-purple-700 shadow-purple-500/30"
            onClick={() => onNavigate("lehrlingsplan")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Admin-Dashboard
// ============================================================================

function AdminDashboard({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const lehrlinge = DataStore.getLehrlinge();
  const planData = DataStore.getPlanData();
  const lastUpload = DataStore.getLastUpload();

  const perLehrjahr = [1, 2, 3, 4].map((jahr) => ({
    jahr,
    count: lehrlinge.filter((l) => l.lehrjahr === jahr).length,
  }));

  return (
    <div className="space-y-6">
      <GlassCard className="overflow-hidden">
        <SectionHeader
          icon={<LayoutDashboard size={22} />}
          title="Admin-Dashboard"
          subtitle="Überblick über alle Lehrlinge und Daten"
        />
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<GraduationCap size={22} />}
          label="Lehrlinge gesamt"
          value={String(lehrlinge.length)}
          gradient="from-blue-500 to-blue-700 shadow-blue-500/30"
        />
        <StatCard
          icon={<CalendarDays size={22} />}
          label="Planeinträge"
          value={String(planData.length)}
          gradient="from-purple-500 to-purple-700 shadow-purple-500/30"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Ø Lernfortschritt"
          value={
            lehrlinge.length > 0
              ? `${Math.round(
                  lehrlinge.reduce(
                    (acc, l) =>
                      acc + DataStore.getGesamtfortschritt(l.personalnummer, l.lehrjahr),
                    0,
                  ) / lehrlinge.length,
                )}%`
              : "–"
          }
          gradient="from-green-500 to-green-700 shadow-green-500/30"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="font-bold text-gray-800 mb-4">Lehrlinge nach Lehrjahr</h2>
          <div className="space-y-3">
            {perLehrjahr.map(({ jahr, count }) => (
              <div key={jahr} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-500">Lehrjahr {jahr}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                    style={{
                      width: `${
                        lehrlinge.length > 0 ? (count / lehrlinge.length) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-6 text-sm font-semibold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="font-bold text-gray-800 mb-4">Letzter Upload</h2>
          {lastUpload ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="text-gray-400">Datei:</span> {lastUpload.fileName}
              </p>
              <p>
                <span className="text-gray-400">Datum:</span>{" "}
                {new Date(lastUpload.date).toLocaleString("de-AT")}
              </p>
            </div>
          ) : (
            <EmptyState text="Noch kein Ausbildungsplan hochgeladen." />
          )}
          <button
            onClick={() => onNavigate("admin")}
            className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:gap-2.5 transition-all"
          >
            Zum Admin-Panel <ArrowRight size={16} />
          </button>
        </GlassCard>
      </div>

      <AdminTodoVerwaltung lehrlinge={lehrlinge} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <QuickAction
          icon={<CalendarDays size={22} />}
          label="Jahresplanung"
          gradient="from-purple-500 to-purple-700 shadow-purple-500/30"
          onClick={() => onNavigate("jahresplanung")}
        />
        <QuickAction
          icon={<Bot size={22} />}
          label="Chatbot"
          gradient="from-blue-500 to-blue-700 shadow-blue-500/30"
          onClick={() => onNavigate("chatbot")}
        />
        <QuickAction
          icon={<GraduationCap size={22} />}
          label="Lernapp"
          gradient="from-green-500 to-green-700 shadow-green-500/30"
          onClick={() => onNavigate("lernapp")}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Hilfskomponenten
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-lg p-4 hover:scale-105 hover:shadow-2xl transition-all duration-300`}
    >
      <div className="opacity-90 mb-2">{icon}</div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs opacity-90 mt-0.5">{label}</div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  gradient,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-lg p-5 flex flex-col items-center gap-2 hover:scale-105 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-6">{text}</p>;
}
