import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Video,
  Link as LinkIcon,
  Loader2,
  X,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { LernAbschnitt, Wissensabfrage } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { uploadToBucket } from "../data/storageUpload";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export function AdminLernverwaltung() {
  const [, setTick] = useState(0);
  const [activeLehrjahr, setActiveLehrjahr] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LernAbschnitt | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const abschnitte = DataStore.getLernAbschnitte().filter(
    (a) => a.lehrjahr === activeLehrjahr,
  );

  function handleDelete(id: string) {
    if (!confirm("Diesen Lernabschnitt wirklich löschen?")) return;
    DataStore.deleteLernAbschnitt(id);
    toast.success("Lernabschnitt gelöscht");
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(a: LernAbschnitt) {
    setEditing(a);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((jahr) => (
            <button
              key={jahr}
              onClick={() => setActiveLehrjahr(jahr)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeLehrjahr === jahr
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Lehrjahr {jahr}
            </button>
          ))}
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={openNew}>
          Abschnitt erstellen
        </Button>
      </div>

      {abschnitte.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          Noch keine Lernabschnitte für Lehrjahr {activeLehrjahr}.
        </p>
      ) : (
        <div className="space-y-2">
          {abschnitte
            .sort((a, b) => a.sortierung - b.sortierung)
            .map((a) => (
              <GlassCard key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 text-sm truncate">{a.titel}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>Sortierung: {a.sortierung}</span>
                    <span className="flex items-center gap-1">
                      <HelpCircle size={12} /> {a.wissensabfragen.length} Fragen
                    </span>
                    {a.videoUrl && (
                      <span className="flex items-center gap-1">
                        <Video size={12} /> Video vorhanden
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                    aria-label="Bearbeiten"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    aria-label="Löschen"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </GlassCard>
            ))}
        </div>
      )}

      <AbschnittFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        abschnitt={editing}
        defaultLehrjahr={activeLehrjahr}
      />
    </div>
  );
}

function AbschnittFormModal({
  isOpen,
  onClose,
  abschnitt,
  defaultLehrjahr,
}: {
  isOpen: boolean;
  onClose: () => void;
  abschnitt: LernAbschnitt | null;
  defaultLehrjahr: number;
}) {
  const [titel, setTitel] = useState("");
  const [lehrjahr, setLehrjahr] = useState(defaultLehrjahr);
  const [beschreibung, setBeschreibung] = useState("");
  const [sortierung, setSortierung] = useState(0);
  const [inhalt, setInhalt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPath, setVideoPath] = useState<string | undefined>();
  const [videoMode, setVideoMode] = useState<"link" | "upload">("link");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fragen, setFragen] = useState<Wissensabfrage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitel(abschnitt?.titel ?? "");
    setLehrjahr(abschnitt?.lehrjahr ?? defaultLehrjahr);
    setBeschreibung(abschnitt?.beschreibung ?? "");
    setSortierung(abschnitt?.sortierung ?? 0);
    setInhalt(abschnitt?.inhalt ?? "");
    setVideoUrl(abschnitt?.videoUrl ?? "");
    setVideoPath(abschnitt?.videoPath);
    setFragen(abschnitt?.wissensabfragen ?? []);
  }, [abschnitt, defaultLehrjahr, isOpen]);

  async function handleVideoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast.error("Nur MP4, WebM oder MOV-Dateien werden unterstützt.");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("Die Datei darf maximal 50 MB groß sein.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    // Simulierter Fortschritt, da fetch keinen nativen Upload-Progress liefert
    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      const uploaded = await uploadToBucket("lernappVideos", file, `lehrjahr-${lehrjahr}`);
      clearInterval(interval);
      setUploadProgress(100);
      if (uploaded) {
        setVideoUrl(uploaded.url);
        setVideoPath(uploaded.path);
        toast.success("Video hochgeladen");
      } else {
        toast.error(
          "Video-Upload fehlgeschlagen. Ist Supabase konfiguriert und der Bucket 'lernapp-videos' angelegt?",
        );
      }
    } finally {
      clearInterval(interval);
      setUploading(false);
    }
  }

  function addFrage() {
    setFragen((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        frage: "",
        antworten: ["", "", "", ""],
        richtigeAntwort: 0,
        erklaerung: "",
      },
    ]);
  }

  function updateFrage(id: string, updates: Partial<Wissensabfrage>) {
    setFragen((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function updateAntwort(frageId: string, idx: number, value: string) {
    setFragen((prev) =>
      prev.map((f) =>
        f.id === frageId
          ? { ...f, antworten: f.antworten.map((a, i) => (i === idx ? value : a)) }
          : f,
      ),
    );
  }

  function removeFrage(id: string) {
    setFragen((prev) => prev.filter((f) => f.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) {
      toast.error("Bitte einen Titel angeben.");
      return;
    }
    const invalidFrage = fragen.find(
      (f) => !f.frage.trim() || f.antworten.some((a) => !a.trim()),
    );
    if (invalidFrage) {
      toast.error("Bitte alle Quiz-Fragen und Antworten vollständig ausfüllen.");
      return;
    }

    const now = new Date().toISOString();

    if (abschnitt) {
      DataStore.updateLernAbschnitt(abschnitt.id, {
        titel,
        lehrjahr,
        beschreibung,
        sortierung,
        inhalt,
        videoUrl: videoUrl || undefined,
        videoPath,
        wissensabfragen: fragen,
      });
      toast.success("Lernabschnitt aktualisiert");
    } else {
      DataStore.addLernAbschnitt({
        id: crypto.randomUUID(),
        titel,
        lehrjahr,
        beschreibung,
        sortierung,
        inhalt,
        dateiIds: [],
        wissensabfragen: fragen,
        erstellt: now,
        aktualisiert: now,
        videoUrl: videoUrl || undefined,
        videoPath,
      });
      toast.success("Lernabschnitt erstellt");
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={abschnitt ? "Lernabschnitt bearbeiten" : "Neuer Lernabschnitt"}
      icon={<GraduationCap size={20} />}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label>
            <input value={titel} onChange={(e) => setTitel(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lehrjahr</label>
            <select
              value={lehrjahr}
              onChange={(e) => setLehrjahr(Number(e.target.value))}
              className="input"
            >
              {[1, 2, 3, 4].map((j) => (
                <option key={j} value={j}>
                  Lehrjahr {j}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschreibung</label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            className="input min-h-[60px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Sortierreihenfolge
          </label>
          <input
            type="number"
            value={sortierung}
            onChange={(e) => setSortierung(Number(e.target.value))}
            className="input w-32"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Lern-Inhalt (HTML wird gerendert)
          </label>
          <textarea
            value={inhalt}
            onChange={(e) => setInhalt(e.target.value)}
            className="input min-h-[140px] font-mono text-xs"
          />
        </div>

        {/* Video-Bereich */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Video</label>
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit mb-3">
            <button
              type="button"
              onClick={() => setVideoMode("link")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                videoMode === "link" ? "bg-white shadow text-blue-700" : "text-gray-500"
              }`}
            >
              <LinkIcon size={13} /> YouTube/Vimeo-Link
            </button>
            <button
              type="button"
              onClick={() => setVideoMode("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                videoMode === "upload" ? "bg-white shadow text-blue-700" : "text-gray-500"
              }`}
            >
              <Video size={13} /> Datei hochladen
            </button>
          </div>

          {videoMode === "link" ? (
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input"
              placeholder="https://youtube.com/watch?v=..."
            />
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                icon={uploading ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
              >
                {uploading ? `Wird hochgeladen… ${uploadProgress}%` : "Video-Datei wählen"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-400">
                MP4, WebM oder MOV, max. 50 MB. Bucket "lernapp-videos" muss in Supabase existieren.
              </p>
              {videoUrl && videoMode === "upload" && (
                <p className="text-xs text-green-600">Video hinterlegt ✓</p>
              )}
            </div>
          )}
        </div>

        {/* Quiz-Fragen-Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Quiz-Fragen ({fragen.length})
            </label>
            <Button type="button" size="sm" variant="ghost" icon={<Plus size={14} />} onClick={addFrage}>
              Frage hinzufügen
            </Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto scroll-thin pr-1">
            {fragen.map((frage, idx) => (
              <div key={frage.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Frage {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFrage(frage.id)}
                    className="p-1 rounded-lg hover:bg-red-50 text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={frage.frage}
                  onChange={(e) => updateFrage(frage.id, { frage: e.target.value })}
                  className="input"
                  placeholder="Fragetext"
                />
                <div className="grid grid-cols-2 gap-2">
                  {frage.antworten.map((antwort, aIdx) => (
                    <label key={aIdx} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`richtig-${frage.id}`}
                        checked={frage.richtigeAntwort === aIdx}
                        onChange={() => updateFrage(frage.id, { richtigeAntwort: aIdx })}
                        className="accent-green-600"
                      />
                      <input
                        value={antwort}
                        onChange={(e) => updateAntwort(frage.id, aIdx, e.target.value)}
                        className="input text-xs py-1.5"
                        placeholder={`Antwort ${String.fromCharCode(65 + aIdx)}`}
                      />
                    </label>
                  ))}
                </div>
                <input
                  value={frage.erklaerung ?? ""}
                  onChange={(e) => updateFrage(frage.id, { erklaerung: e.target.value })}
                  className="input text-xs"
                  placeholder="Erklärung nach Beantwortung (optional)"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={uploading}>
            {abschnitt ? "Speichern" : "Abschnitt erstellen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
