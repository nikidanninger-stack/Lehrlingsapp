import { useEffect, useState } from "react";
import {
  Stethoscope,
  Send,
  Stamp,
  FileCheck2,
  FileX2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import type { Krankmeldung as KrankmeldungType, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
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
  return <LehrlingKrankmeldungView user={user} />;
}

// ============================================================================
// Lehrling-Ansicht: Formular + eigene Historie
// ============================================================================

function LehrlingKrankmeldungView({ user }: { user: User }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasDoctor, setHasDoctor] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateDate, setCertificateDate] = useState("");
  const [notes, setNotes] = useState("");

  const historie = DataStore.getKrankmeldungenForLehrling(user.personalnummer);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate.trim() || !endDate.trim()) {
      toast.error("Bitte Start- und Enddatum angeben.");
      return;
    }

    const meldung: KrankmeldungType = {
      id: crypto.randomUUID(),
      personalnummer: user.personalnummer,
      lehrlingName: user.name,
      startDate,
      endDate,
      hasDoctor,
      hasCertificate,
      certificateDate: hasCertificate ? certificateDate : undefined,
      notes: notes.trim() || undefined,
      datum: new Date().toISOString(),
    };

    DataStore.addKrankmeldung(meldung);
    toast.success("Krankmeldung erfolgreich übermittelt.");

    setStartDate("");
    setEndDate("");
    setHasDoctor(false);
    setHasCertificate(false);
    setCertificateDate("");
    setNotes("");
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <SectionHeader
          icon={<Stethoscope size={22} />}
          title="Krankmeldung"
          subtitle="Melde deinen Krankenstand digital"
        />
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Von">
              <input
                type="text"
                placeholder="DD.MM.YYYY"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Bis">
              <input
                type="text"
                placeholder="DD.MM.YYYY"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <ToggleRow
            label="Warst du beim Arzt?"
            value={hasDoctor}
            onChange={setHasDoctor}
          />
          <ToggleRow
            label="Liegt eine Krankschreibung vor?"
            value={hasCertificate}
            onChange={setHasCertificate}
          />

          {hasCertificate && (
            <Field label="Datum der Krankschreibung">
              <input
                type="text"
                placeholder="DD.MM.YYYY"
                value={certificateDate}
                onChange={(e) => setCertificateDate(e.target.value)}
                className="input"
              />
            </Field>
          )}

          <Field label="Anmerkungen (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Zusätzliche Informationen für deinen Ausbildner..."
            />
          </Field>

          <Button type="submit" icon={<Send size={16} />} className="w-full">
            Krankmeldung absenden
          </Button>
        </form>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-bold text-gray-800 mb-4">Deine Krankmeldungen</h3>
        {historie.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Du hast bisher keine Krankmeldungen abgegeben.
          </p>
        ) : (
          <div className="space-y-3">
            {historie.map((m) => (
              <KrankmeldungCard key={m.id} meldung={m} />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Admin-Ansicht: Alle Krankmeldungen, Filter nach Lehrjahr
// ============================================================================

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
    <GlassCard>
      <SectionHeader
        icon={<Stethoscope size={22} />}
        title="Krankmeldungen"
        subtitle="Übersicht aller gemeldeten Krankenstände"
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
              <KrankmeldungCard key={m.id} meldung={m} showName />
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Gemeinsame Karten-Komponente
// ============================================================================

function KrankmeldungCard({
  meldung,
  showName = false,
}: {
  meldung: KrankmeldungType;
  showName?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {showName && (
            <p className="font-semibold text-gray-800 text-sm mb-0.5">
              {meldung.lehrlingName}
            </p>
          )}
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
                <FileX2 size={12} /> Ohne Krankschreibung
              </span>
            )}
          </div>
        </div>
        {(meldung.notes || meldung.certificateDate) && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Details einklappen" : "Details anzeigen"}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
          {meldung.certificateDate && (
            <p>
              <span className="text-gray-400">Krankschreibung vom:</span>{" "}
              {meldung.certificateDate}
            </p>
          )}
          {meldung.notes && <p>{meldung.notes}</p>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            value ? "bg-white shadow text-blue-700" : "text-gray-500"
          }`}
        >
          Ja
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            !value ? "bg-white shadow text-blue-700" : "text-gray-500"
          }`}
        >
          Nein
        </button>
      </div>
    </div>
  );
}
