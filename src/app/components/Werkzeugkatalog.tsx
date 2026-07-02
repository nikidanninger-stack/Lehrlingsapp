import { useEffect, useRef, useState } from "react";
import { Wrench, Search, Plus, Pencil, Trash2, Star, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Werkzeug as WerkzeugType, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { uploadToBucket, readFileAsDataUrl } from "../data/storageUpload";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface WerkzeugkatalogProps {
  user: User;
}

export function Werkzeugkatalog({ user }: WerkzeugkatalogProps) {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [kategorieFilter, setKategorieFilter] = useState<string>("alle");
  const [lehrjahrFilter, setLehrjahrFilter] = useState<number | "alle">(
    user.role === "admin" ? "alle" : user.lehrjahr,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WerkzeugType | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";
  const alle = DataStore.getWerkzeuge();
  const kategorien = Array.from(new Set(alle.map((w) => w.kategorie))).sort();

  const gefiltert = alle.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.beschreibung.toLowerCase().includes(search.toLowerCase());
    const matchesKategorie = kategorieFilter === "alle" || w.kategorie === kategorieFilter;
    const matchesLehrjahr =
      lehrjahrFilter === "alle" || w.lehrjahre.includes(lehrjahrFilter as number);
    return matchesSearch && matchesKategorie && matchesLehrjahr;
  });

  function handleDelete(id: string) {
    if (!confirm("Dieses Werkzeug wirklich löschen?")) return;
    DataStore.deleteWerkzeug(id);
    toast.success("Werkzeug gelöscht");
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(w: WerkzeugType) {
    setEditing(w);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<Wrench size={22} />}
          title="Werkzeugkatalog"
          subtitle="Alle relevanten Werkzeuge und Geräte im Überblick"
          actions={
            isAdmin ? (
              <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={openNew}>
                Hinzufügen
              </Button>
            ) : undefined
          }
        />
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Werkzeug suchen..."
                className="input pl-9"
              />
            </div>
            <select
              value={kategorieFilter}
              onChange={(e) => setKategorieFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="alle">Alle Kategorien</option>
              {kategorien.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
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
                {jahr === "alle" ? "Alle" : `LJ ${jahr}`}
              </button>
            ))}
          </div>

          {gefiltert.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Keine Werkzeuge gefunden.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gefiltert.map((w) => (
                <div
                  key={w.id}
                  className={`rounded-xl border overflow-hidden bg-white/60 hover:shadow-md transition-shadow duration-300 ${
                    w.wichtig ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"
                  }`}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                    {w.bildUrl ? (
                      <img src={w.bildUrl} alt={w.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={28} className="text-gray-300" />
                    )}
                    {w.wichtig && (
                      <div className="absolute top-1.5 right-1.5 bg-amber-400 text-white rounded-full p-1">
                        <Star size={12} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-gray-800 truncate">{w.name}</p>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 mt-1">
                      {w.kategorie}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                      {w.beschreibung}
                    </p>
                    {isAdmin && (
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => openEdit(w)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-gray-100 text-gray-500 text-xs"
                        >
                          <Pencil size={12} /> Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-500"
                          aria-label="Löschen"
                        >
                          <Trash2 size={12} />
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
        <WerkzeugFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          werkzeug={editing}
        />
      )}
    </div>
  );
}

function WerkzeugFormModal({
  isOpen,
  onClose,
  werkzeug,
}: {
  isOpen: boolean;
  onClose: () => void;
  werkzeug: WerkzeugType | null;
}) {
  const [name, setName] = useState(werkzeug?.name ?? "");
  const [kategorie, setKategorie] = useState(werkzeug?.kategorie ?? "");
  const [beschreibung, setBeschreibung] = useState(werkzeug?.beschreibung ?? "");
  const [lehrjahre, setLehrjahre] = useState<number[]>(werkzeug?.lehrjahre ?? [1, 2, 3, 4]);
  const [wichtig, setWichtig] = useState(werkzeug?.wichtig ?? false);
  const [bildUrl, setBildUrl] = useState(werkzeug?.bildUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(werkzeug?.name ?? "");
    setKategorie(werkzeug?.kategorie ?? "");
    setBeschreibung(werkzeug?.beschreibung ?? "");
    setLehrjahre(werkzeug?.lehrjahre ?? [1, 2, 3, 4]);
    setWichtig(werkzeug?.wichtig ?? false);
    setBildUrl(werkzeug?.bildUrl ?? "");
  }, [werkzeug, isOpen]);

  function toggleLehrjahr(jahr: number) {
    setLehrjahre((prev) =>
      prev.includes(jahr) ? prev.filter((j) => j !== jahr) : [...prev, jahr].sort(),
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadToBucket("werkzeugFotos", file, "werkzeuge");
      if (uploaded) {
        setBildUrl(uploaded.url);
        toast.success("Foto hochgeladen");
      } else {
        // Offline-Fallback: Base64 im LocalStorage
        const dataUrl = await readFileAsDataUrl(file);
        setBildUrl(dataUrl);
        toast.info("Foto lokal gespeichert (Supabase nicht verbunden).");
      }
    } catch {
      toast.error("Foto konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !kategorie.trim()) {
      toast.error("Bitte Name und Kategorie ausfüllen.");
      return;
    }

    if (werkzeug) {
      DataStore.updateWerkzeug(werkzeug.id, {
        name,
        kategorie,
        beschreibung,
        lehrjahre,
        wichtig,
        bildUrl: bildUrl || undefined,
      });
      toast.success("Werkzeug aktualisiert");
    } else {
      DataStore.addWerkzeug({
        id: crypto.randomUUID(),
        name,
        kategorie,
        beschreibung,
        lehrjahre,
        wichtig,
        bildUrl: bildUrl || undefined,
      });
      toast.success("Werkzeug hinzugefügt");
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={werkzeug ? "Werkzeug bearbeiten" : "Werkzeug hinzufügen"}
      icon={<Wrench size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : bildUrl ? (
              <img src={bildUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageOff size={20} className="text-gray-300" />
            )}
          </div>
          <div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Foto hochladen
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorie</label>
          <input
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            className="input"
            placeholder="z.B. Handwerkzeug, Messtechnik"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschreibung</label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            className="input min-h-[70px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Lehrjahre</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((jahr) => (
              <label
                key={jahr}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                  lehrjahre.includes(jahr)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={lehrjahre.includes(jahr)}
                  onChange={() => toggleLehrjahr(jahr)}
                  className="sr-only"
                />
                LJ {jahr}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={wichtig}
            onChange={(e) => setWichtig(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-gray-700">Als wichtig hervorheben</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={uploading}>
            {werkzeug ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
