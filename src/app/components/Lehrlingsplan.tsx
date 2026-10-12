import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, Search, X } from "lucide-react";
import type { Lehrling, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { AusbildungsplanMatrix } from "./AusbildungsplanMatrix";
import { LehrlingMonatskalender } from "./LehrlingMonatskalender";
import { AdminMassenaenderung } from "./AdminMassenaenderung";

interface LehrlingsplanProps {
  user: User;
}

// Groß-/Kleinschreibung und Umlaute/Akzente ignorieren, damit z.B.
// "ohlinger" auch "Öhlinger" findet.
function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .trim();
}

function suchtextFuer(l: Lehrling): string {
  return normalisiere(
    [l.name, l.personalnummer, l.standort ?? "", l.beruf ?? "", `${l.lehrjahr}. lehrjahr`, `lj${l.lehrjahr}`].join(" "),
  );
}

// Alle eingegebenen Wörter müssen vorkommen ("jell 2" -> Benjamin Jell im 2. LJ)
function passtZurSuche(l: Lehrling, suche: string): boolean {
  const woerter = normalisiere(suche).split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return true;
  const text = suchtextFuer(l);
  return woerter.every((w) => text.includes(w));
}

export function Lehrlingsplan({ user }: LehrlingsplanProps) {
  const [, setTick] = useState(0);
  const isAdmin = user.role === "admin";
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">(
    isAdmin ? "alle" : user.lehrjahr,
  );
  const [standortFilter, setStandortFilter] = useState<string>("alle");
  const [suche, setSuche] = useState("");
  const [ausgewaehltePersonalnummer, setAusgewaehltePersonalnummer] = useState<string | null>(null);
  const kalenderRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const alleLehrlinge = DataStore.getLehrlinge();
  const allePlanEntries = DataStore.getPlanData();

  // ---- Lehrling-Ansicht: eigener Monatskalender, nicht editierbar ----
  if (!isAdmin) {
    const eigenePlanEntries = allePlanEntries.filter(
      (e) => e.personalnummer === user.personalnummer,
    );
    return (
      <div className="space-y-4">
        <GlassCard>
          <SectionHeader
            icon={<CalendarDays size={22} />}
            title="Lehrlingsplan"
            subtitle={`Dein Ausbildungsplan – Lehrjahr ${user.lehrjahr}`}
          />
          <div className="p-3 sm:p-6">
            <LehrlingMonatskalender planData={eigenePlanEntries} />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <AdminLehrlingsplan
      alleLehrlinge={alleLehrlinge}
      allePlanEntries={allePlanEntries}
      lehrjahrFilter={lehrjahrFilter}
      setLehrjahrFilter={setLehrjahrFilter}
      standortFilter={standortFilter}
      setStandortFilter={setStandortFilter}
      suche={suche}
      setSuche={setSuche}
      ausgewaehltePersonalnummer={ausgewaehltePersonalnummer}
      setAusgewaehltePersonalnummer={setAusgewaehltePersonalnummer}
      kalenderRef={kalenderRef}
      onDataChanged={() => setTick((t) => t + 1)}
    />
  );
}

// ---------------------------------------------------------------------------
// Admin-Ansicht (eigene Komponente, damit die Hooks sauber bleiben)
// ---------------------------------------------------------------------------

interface AdminLehrlingsplanProps {
  alleLehrlinge: Lehrling[];
  allePlanEntries: ReturnType<typeof DataStore.getPlanData>;
  lehrjahrFilter: number | "alle";
  setLehrjahrFilter: (v: number | "alle") => void;
  standortFilter: string;
  setStandortFilter: (v: string) => void;
  suche: string;
  setSuche: (v: string) => void;
  ausgewaehltePersonalnummer: string | null;
  setAusgewaehltePersonalnummer: (v: string | null) => void;
  kalenderRef: React.RefObject<HTMLDivElement | null>;
  onDataChanged: () => void;
}

function AdminLehrlingsplan({
  alleLehrlinge,
  allePlanEntries,
  lehrjahrFilter,
  setLehrjahrFilter,
  standortFilter,
  setStandortFilter,
  suche,
  setSuche,
  ausgewaehltePersonalnummer,
  setAusgewaehltePersonalnummer,
  kalenderRef,
  onDataChanged,
}: AdminLehrlingsplanProps) {
  const standorte = useMemo(() => {
    const set = new Set<string>();
    alleLehrlinge.forEach((l) => {
      if (l.standort && l.standort.trim()) set.add(l.standort.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [alleLehrlinge]);

  const gefilterteLehrlinge = useMemo(
    () =>
      alleLehrlinge.filter((l) => {
        if (lehrjahrFilter !== "alle" && l.lehrjahr !== lehrjahrFilter) return false;
        if (standortFilter !== "alle") {
          if (standortFilter === "ohne") {
            if (l.standort && l.standort.trim()) return false;
          } else if ((l.standort ?? "").trim() !== standortFilter) {
            return false;
          }
        }
        return passtZurSuche(l, suche);
      }),
    [alleLehrlinge, lehrjahrFilter, standortFilter, suche],
  );

  const relevantePersonalnummern = useMemo(
    () => new Set(gefilterteLehrlinge.map((l) => l.personalnummer)),
    [gefilterteLehrlinge],
  );
  const gefiltertePlanEntries = useMemo(
    () => allePlanEntries.filter((e) => relevantePersonalnummern.has(e.personalnummer)),
    [allePlanEntries, relevantePersonalnummern],
  );

  const ausgewaehlterLehrling = ausgewaehltePersonalnummer
    ? alleLehrlinge.find((l) => l.personalnummer === ausgewaehltePersonalnummer)
    : undefined;

  const filterAktiv = suche.trim() !== "" || lehrjahrFilter !== "alle" || standortFilter !== "alle";
  const zeigeTrefferliste = suche.trim() !== "";

  function oeffneKalender(personalnummer: string) {
    setAusgewaehltePersonalnummer(personalnummer);
    // Nach dem Rendern zur Kalenderkarte scrollen
    requestAnimationFrame(() => {
      kalenderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleSucheEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && gefilterteLehrlinge.length === 1) {
      e.preventDefault();
      oeffneKalender(gefilterteLehrlinge[0].personalnummer);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") setSuche("");
  }

  function allesZuruecksetzen() {
    setSuche("");
    setLehrjahrFilter("alle");
    setStandortFilter("alle");
  }

  const chipBasis =
    "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap";
  const chipAktiv = "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30";
  const chipInaktiv = "bg-gray-100 text-gray-600 hover:bg-gray-200";

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<CalendarDays size={22} />}
          title="Lehrlingsplan"
          subtitle="Ausbildungsplan aller Lehrlinge"
        />
        <div className="p-3 sm:p-6 space-y-3">
          {/* Suche */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              onKeyDown={handleSucheEnter}
              placeholder="Name, Personalnummer, Standort oder Beruf suchen …"
              aria-label="Lehrlinge suchen"
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 py-3 text-base sm:text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 [&::-webkit-search-cancel-button]:hidden"
            />
            {suche && (
              <button
                type="button"
                onClick={() => setSuche("")}
                aria-label="Suche leeren"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter: Lehrjahr */}
          <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto scroll-thin pb-1 sm:flex-wrap sm:overflow-visible">
            {(["alle", 1, 2, 3, 4] as const).map((jahr) => (
              <button
                key={jahr}
                onClick={() => setLehrjahrFilter(jahr)}
                className={`${chipBasis} ${lehrjahrFilter === jahr ? chipAktiv : chipInaktiv}`}
              >
                {jahr === "alle" ? "Alle Lehrjahre" : `${jahr}. Lehrjahr`}
              </button>
            ))}
          </div>

          {/* Filter: Standort */}
          {standorte.length > 0 && (
            <div className="-mx-3 px-3 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto scroll-thin pb-1 sm:flex-wrap sm:overflow-visible items-center">
              <MapPin size={15} className="text-gray-400 shrink-0" />
              {["alle", ...standorte, "ohne"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStandortFilter(s)}
                  className={`${chipBasis} !py-1 !text-xs ${standortFilter === s ? chipAktiv : chipInaktiv}`}
                >
                  {s === "alle" ? "Alle Standorte" : s === "ohne" ? "Ohne Standort" : s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {filterAktiv
                ? `${gefilterteLehrlinge.length} von ${alleLehrlinge.length} Lehrlingen`
                : `${alleLehrlinge.length} Lehrlinge`}
            </span>
            {filterAktiv && (
              <button
                type="button"
                onClick={allesZuruecksetzen}
                className="font-semibold text-blue-700 hover:underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Trefferliste bei aktiver Suche: direkt den Einzelkalender öffnen */}
          {zeigeTrefferliste && gefilterteLehrlinge.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {gefilterteLehrlinge.slice(0, 9).map((l) => (
                <button
                  key={l.personalnummer}
                  type="button"
                  onClick={() => oeffneKalender(l.personalnummer)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-all hover:shadow-md active:scale-[0.99] ${
                    ausgewaehltePersonalnummer === l.personalnummer
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 truncate">{l.name}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                      <CalendarDays size={13} /> Kalender
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Nr. {l.personalnummer} · {l.lehrjahr}. Lehrjahr
                    {l.standort ? ` · ${l.standort}` : ""}
                    {l.beruf ? ` · ${l.beruf}` : ""}
                  </p>
                </button>
              ))}
              {gefilterteLehrlinge.length > 9 && (
                <p className="text-xs text-gray-400 self-center px-1">
                  + {gefilterteLehrlinge.length - 9} weitere – Suche genauer eingeben
                </p>
              )}
            </div>
          )}

          {gefilterteLehrlinge.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">
                {suche.trim()
                  ? `Niemand gefunden für „${suche.trim()}“.`
                  : "Keine Lehrlinge für diese Auswahl gefunden."}
              </p>
              <button
                type="button"
                onClick={allesZuruecksetzen}
                className="mt-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : (
            <AusbildungsplanMatrix
              lehrlinge={gefilterteLehrlinge}
              planData={gefiltertePlanEntries}
              highlightPersonalnummer={ausgewaehltePersonalnummer ?? undefined}
              editable
              onDataChanged={onDataChanged}
              onOpenLehrling={oeffneKalender}
            />
          )}
        </div>
      </GlassCard>

      {/* Ausgewählter Lehrling: eigene, vollflächige Kalenderkarte – wie beim Lehrling selbst */}
      <div ref={kalenderRef} className="scroll-mt-4">
        {ausgewaehlterLehrling ? (
          <GlassCard>
            <SectionHeader
              icon={<CalendarDays size={22} />}
              title={ausgewaehlterLehrling.name}
              subtitle={`Personalnummer ${ausgewaehlterLehrling.personalnummer} · Lehrjahr ${ausgewaehlterLehrling.lehrjahr}${
                ausgewaehlterLehrling.standort ? ` · ${ausgewaehlterLehrling.standort}` : ""
              }`}
              actions={
                <button
                  type="button"
                  onClick={() => setAusgewaehltePersonalnummer(null)}
                  aria-label="Kalender schließen"
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X size={18} />
                </button>
              }
            />
            <div className="p-3 sm:p-6">
              <LehrlingMonatskalender
                key={ausgewaehlterLehrling.personalnummer}
                planData={allePlanEntries.filter(
                  (e) => e.personalnummer === ausgewaehlterLehrling.personalnummer,
                )}
                editable
                personalnummer={ausgewaehlterLehrling.personalnummer}
                lehrlingName={ausgewaehlterLehrling.name}
                lehrjahr={ausgewaehlterLehrling.lehrjahr}
                standort={ausgewaehlterLehrling.standort ?? ""}
                onDataChanged={onDataChanged}
              />
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <div className="p-4 sm:p-5 flex items-center gap-3 text-sm text-gray-500">
              <CalendarDays size={18} className="text-blue-600 shrink-0" />
              <span>
                Tipp: Oben suchen und auf einen Treffer tippen – oder im Plan auf das
                Kalender-Symbol neben einem Namen –, um den Einzelkalender zu öffnen und zu bearbeiten.
              </span>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Massenänderung für ganze Gruppen */}
      <AdminMassenaenderung />
    </div>
  );
}
