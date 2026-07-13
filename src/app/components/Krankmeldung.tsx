import { useEffect, useState } from "react";
import { Stethoscope, Mail, Phone, AlertTriangle, Stamp, FileCheck2, FileX2 } from "lucide-react";
import type { User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { formatDateLong } from "../utils/dateUtils";

interface KrankmeldungProps {
  user: User;
}

export function Krankmeldung({ user }: KrankmeldungProps) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  if (user.role === "admin") {
    return <AdminKrankmeldungenView />;
  }
  return <LehrlingKrankmeldungInfo />;
}

function LehrlingKrankmeldungInfo() {
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<Stethoscope size={22} />}
          title="Krankmeldung"
          subtitle="So meldest du dich im Krankheitsfall richtig ab"
        />
        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              Melde deine Abwesenheit <strong>sofort</strong>, spätestens jedoch bis
              8:00 Uhr am ersten Krankheitstag.
            </p>
          </div>

          <div className="space-y-4">
            <Step
              nr={1}
              icon={<Mail size={18} />}
              title="Sofort eine E-Mail senden"
              description={
                <>
                  Schicke umgehend eine E-Mail an{" "}
                  
                    href="mailto:Montage.at@hauser.com"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Montage.at@hauser.com
                  </a>{" "}
                  mit deinem Namen und dem voraussichtlichen Krankheitszeitraum.
                </>
              }
            />
            <Step
              nr={2}
              icon={<Phone size={18} />}
              title="Deinen Monteur bzw. Servicetechniker informieren"
              description="Gib zusätzlich direkt deinem zuständigen Monteur oder Servicetechniker Bescheid, damit die Tagesplanung entsprechend angepasst werden kann."
            />
            <Step
              nr={3}
              icon={<FileCheck2 size={18} />}
              title="Krankmeldung so bald wie möglich nachreichen"
              description="Reiche die ärztliche Krankmeldung (Bestätigung) so bald wie möglich nach – idealerweise noch am selben Tag oder sobald du beim Arzt warst."
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Step({
  nr,
  icon,
  title,
  description,
}: {
  nr: number;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-blue-500/30">
        {nr}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-600">{icon}</span>
          <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function AdminKrankmeldungenView() {
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">("alle");
  const alle = DataStore.getKrankmeldungen().sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const lehrlinge = DataStore.getLehrlinge();

  const gefiltert = alle.filter((m) => {
    if (lehrjahrFilter === "alle") return true;
    const lehrling = lehrlinge.find((l) => l.personalnummer === m.personalnummer);
    return lehrling?.lehrjahr === lehrjahrFilter;
  });

  return (
    <div className="space-y-4">
      <GlassCard className="p-6 flex items-start gap-3">
        <Mail size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600">
          Lehrlinge melden sich im Krankheitsfall direkt per E-Mail an{" "}
          <span className="font-semibold text-gray-800">Montage.at@hauser.com</span>{" "}
          und informieren zusätzlich ihren Monteur/Servicetechniker. Unten siehst du
          eventuell noch vorhandene, früher über das Formular eingegangene Meldungen.
        </p>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          icon={<Stethoscope size={22} />}
          title="Krankmeldungen (Archiv)"
          subtitle="Historische Meldungen aus dem früheren Formular"
        />
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["alle", 1, 2, 3, 4] as const).map((jahr) => (
              <button
                key={jahr}
                onClick={() => setLehrjahrFilter(jahr)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  lehrjahrFilter === jahr
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {jahr === "alle" ? "Alle Lehrjahre" : `Lehrjahr ${jahr}`}
              </button>
            ))}
          </div>

          {gefiltert.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Keine Krankmeldungen für diese Auswahl vorhanden.
            </p>
          ) : (
            <div className="space-y-3">
              {gefiltert.map((m) => (
                <KrankmeldungCard key={m.id} meldung={m} />
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function KrankmeldungCard({
  meldung,
}: {
  meldung: ReturnType<typeof DataStore.getKrankmeldungen>[number];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
      <p className="font-semibold text-gray-800 text-sm mb-0.5">{meldung.lehrlingName}</p>
      <p className="text-sm text-gray-600">
        {formatDateLong(meldung.startDate)} – {formatDateLong(meldung.endDate)}
      </p>
      <div className="flex gap-2 flex-wrap mt-2">
        {meldung.hasDoctor && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
            <Stamp size={12} /> Arzt besucht
          </span>
        )}
        {meldung.hasCertificate ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">
            <FileCheck2 size={12} /> Mit Krankschreibung
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
            <FileX2 size={12} /> Ohne
