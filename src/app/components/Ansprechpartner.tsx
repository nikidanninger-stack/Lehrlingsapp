import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Phone,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { Ansprechpartner as AnsprechpartnerType, PlanEntry, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { parseDate } from "../utils/dateUtils";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TypeBadge, getMergedLabels, getVersteckteKategorien } from "./ui/TypeBadge";

interface AnsprechpartnerProps {
  user: User;
}

// Kategorien, die keine Abteilung sind und bei denen es daher keinen
// zuständigen Ansprechpartner gibt (werden in der Auswahl ausgeblendet).
const KEINE_ABTEILUNG = new Set(["feiertag", "betriebsurlaub"]);

type Zeitraum = "aktuell" | "kommend" | "bisher";

interface AbteilungInfo {
  type: string;
  zeitraum: Zeitraum;
  von: Date;
  bis: Date;
  vonText: string;
  bisText: string;
}

// Fasst die Plan-Einträge eines Lehrlings pro Kategorie (= Abteilung)
// zusammen und ordnet sie ein: aktuell / kommend / bisher.
function abteilungenAusPlan(entries: PlanEntry[]): AbteilungInfo[] {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const proTyp = new Map<string, { von: Date; bis: Date; vonText: string; bisText: string; aktuell: boolean }>();

  for (const e of entries) {
    if (!e.type || KEINE_ABTEILUNG.has(e.type)) continue;
    const von = parseDate(e.startDate);
    const bis = parseDate(e.endDate) ?? von;
    if (!von || !bis) continue;
    const aktuell = von <= heute && bis >= heute;
    const vorhanden = proTyp.get(e.type);
    if (!vorhanden) {
      proTyp.set(e.type, { von, bis, vonText: e.startDate, bisText: e.endDate, aktuell });
    } else {
      if (von < vorhanden.von) {
        vorhanden.von = von;
        vorhanden.vonText = e.startDate;
      }
      if (bis > vorhanden.bis) {
        vorhanden.bis = bis;
        vorhanden.bisText = e.endDate;
      }
      vorhanden.aktuell = vorhanden.aktuell || aktuell;
    }
  }

  const liste: AbteilungInfo[] = [];
  proTyp.forEach((v, type) => {
    const zeitraum: Zeitraum = v.aktuell ? "aktuell" : v.von > heute ? "kommend" : "bisher";
    liste.push({ type, zeitraum, ...v });
  });

  const reihenfolge: Record<Zeitraum, number> = { aktuell: 0, kommend: 1, bisher: 2 };
  return liste.sort((a, b) => {
    if (a.zeitraum !== b.zeitraum) return reihenfolge[a.zeitraum] - reihenfolge[b.zeitraum];
    // kommend: nächste zuerst, bisher: zuletzt besuchte zuerst
    return a.zeitraum === "bisher"
      ? b.bis.getTime() - a.bis.getTime()
      : a.von.getTime() - b.von.getTime();
  });
}

function initialen(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function Avatar({ person, size = "md" }: { person: AnsprechpartnerType; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-10 h-10 text-xs" : "w-12 h-12 text-sm";
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold shrink-0 overflow-hidden`}
    >
      {person.photo ? (
        <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
      ) : (
        initialen(person.name)
      )}
    </div>
  );
}

function KontaktButtons({ person }: { person: AnsprechpartnerType }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {person.phone && (
        <a
          href={`tel:${person.phone.replace(/\s/g, "")}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
        >
          <Phone size={13} /> Anrufen
        </a>
      )}
      {person.email && (
        <a
          href={`mailto:${person.email}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-blue-700 text-xs font-medium hover:bg-blue-50"
        >
          <Mail size={13} /> E-Mail
        </a>
      )}
    </div>
  );
}

const zeitraumText: Record<Zeitraum, string> = {
  aktuell: "Gerade hier",
  kommend: "Kommt noch",
  bisher: "Warst du schon",
};

const zeitraumStyle: Record<Zeitraum, string> = {
  aktuell: "bg-green-100 text-green-800",
  kommend: "bg-blue-100 text-blue-800",
  bisher: "bg-gray-100 text-gray-600",
};

export function Ansprechpartner({ user }: AnsprechpartnerProps) {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnsprechpartnerType | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";
  const alle = DataStore.getAnsprechpartner();
  const labels = getMergedLabels();
  const gefiltert = alle.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.abteilung.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      (p.kategorien ?? []).some((k) => (labels[k] ?? k).toLowerCase().includes(q))
    );
  });

  const meineAbteilungen = isAdmin
    ? []
    : abteilungenAusPlan(DataStore.getPlanDataForLehrling(user.personalnummer));

  async function handleDelete(id: string) {
    if (!confirm("Diesen Ansprechpartner wirklich löschen?")) return;
    const ok = await DataStore.deleteAnsprechpartnerAwaited(id);
    if (ok) {
      toast.success("Ansprechpartner gelöscht");
    } else {
      toast.error("Löschen fehlgeschlagen - siehe Konsole (F12)");
    }
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: AnsprechpartnerType) {
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <GlassCard>
          <SectionHeader
            icon={<Building2 size={22} />}
            title="Meine Abteilungen"
            subtitle="Wer ist zuständig, wo du laut Lehrlingsplan bist, warst oder hinkommst"
          />
          <div className="p-6 space-y-3">
            {meineAbteilungen.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                In deinem Lehrlingsplan sind noch keine Abteilungen eingetragen.
              </p>
            ) : (
              meineAbteilungen.map((a) => {
                const zustaendig = alle.filter((p) => (p.kategorien ?? []).includes(a.type));
                return (
                  <div
                    key={a.type}
                    className={`rounded-xl border p-4 ${
                      a.zeitraum === "aktuell"
                        ? "border-green-300 bg-green-50/60"
                        : "border-gray-200 bg-white/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <TypeBadge type={a.type} />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${zeitraumStyle[a.zeitraum]}`}
                      >
                        {zeitraumText[a.zeitraum]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {a.vonText} – {a.bisText}
                      </span>
                    </div>
                    {zustaendig.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Noch kein Ansprechpartner hinterlegt – frag im Zweifel deinen
                        Ausbilder.
                      </p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {zustaendig.map((p) => (
                          <div key={p.id} className="flex items-start gap-3">
                            <Avatar person={p} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                              <p className="text-xs text-gray-500">{p.position}</p>
                              <KontaktButtons person={p} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <SectionHeader
          icon={<Users size={22} />}
          title={isAdmin ? "Ansprechpartner" : "Alle Ansprechpartner"}
          subtitle={
            isAdmin
              ? "Kontakte pflegen und festlegen, wer für welche Abteilung zuständig ist"
              : "Deine Kontakte bei Hauser Kältetechnik"
          }
          actions={
            isAdmin ? (
              <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={openNew}>
                Hinzufügen
              </Button>
            ) : undefined
          }
        />
        <div className="p-6 space-y-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder Abteilung suchen..."
              className="input pl-9"
            />
          </div>

          {gefiltert.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Keine Ansprechpartner gefunden.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {gefiltert.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/60 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-start gap-3">
                    <Avatar person={p} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.position}
                        {p.abteilung ? ` · ${p.abteilung}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs">
                        {p.phone && (
                          <a
                            href={`tel:${p.phone.replace(/\s/g, "")}`}
                            className="flex items-center gap-1 text-blue-700 hover:underline"
                          >
                            <Phone size={12} /> {p.phone}
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            className="flex items-center gap-1 text-blue-700 hover:underline"
                          >
                            <Mail size={12} /> {p.email}
                          </a>
                        )}
                      </div>
                      {(p.kategorien ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(p.kategorien ?? []).map((k) => (
                            <TypeBadge key={k} type={k} className="!text-[10px] !px-1.5 !py-0.5" />
                          ))}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Bearbeiten"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          aria-label="Löschen"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {isAdmin && (
        <AnsprechpartnerFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          person={editing}
        />
      )}
    </div>
  );
}

function AnsprechpartnerFormModal({
  isOpen,
  onClose,
  person,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: AnsprechpartnerType | null;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [position, setPosition] = useState(person?.position ?? "");
  const [abteilung, setAbteilung] = useState(person?.abteilung ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [kategorien, setKategorien] = useState<string[]>(person?.kategorien ?? []);

  useEffect(() => {
    setName(person?.name ?? "");
    setPosition(person?.position ?? "");
    setAbteilung(person?.abteilung ?? "");
    setPhone(person?.phone ?? "");
    setEmail(person?.email ?? "");
    setKategorien(person?.kategorien ?? []);
  }, [person, isOpen]);

  // Auswählbare Abteilungen: alle Plan-Kategorien (eingebaut + selbst
  // angelegt), ohne ausgeblendete - außer sie sind schon zugeordnet.
  const versteckt = getVersteckteKategorien();
  const auswahl = Object.entries(getMergedLabels())
    .filter(([key]) => !KEINE_ABTEILUNG.has(key))
    .filter(([key]) => !versteckt.has(key) || kategorien.includes(key))
    .sort((a, b) => a[1].localeCompare(b[1], "de"));

  function toggleKategorie(key: string) {
    setKategorien((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !position.trim()) {
      toast.error("Bitte Name und Position ausfüllen.");
      return;
    }

    let ok: boolean;
    if (person) {
      ok = await DataStore.updateAnsprechpartnerAwaited(person.id, {
        name,
        position,
        abteilung,
        phone,
        email,
        kategorien,
      });
    } else {
      ok = await DataStore.addAnsprechpartnerAwaited({
        id: crypto.randomUUID(),
        name,
        position,
        abteilung,
        phone,
        email,
        responsibilities: [],
        kategorien,
      });
    }

    if (ok) {
      toast.success(person ? "Ansprechpartner aktualisiert" : "Ansprechpartner hinzugefügt");
    } else {
      toast.error("Konnte nicht gespeichert werden - siehe Konsole (F12)");
      return;
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={person ? "Ansprechpartner bearbeiten" : "Ansprechpartner hinzufügen"}
      icon={<Users size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Abteilung</label>
            <input
              value={abteilung}
              onChange={(e) => setAbteilung(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zuständig für (Abteilungen im Lehrlingsplan)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Lehrlinge, die laut Plan in einer dieser Abteilungen sind, sehen diese Person als
            Ansprechpartner.
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
            {auswahl.map(([key, label]) => {
              const aktiv = kategorien.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleKategorie(key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    aktiv
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {aktiv && <Check size={12} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {person ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
