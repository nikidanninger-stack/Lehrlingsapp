import { useEffect, useState } from "react";
import { KeyRound, Save } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";

// ----------------------------------------------------------------------------
// AdminZugangsdaten
//
// Reine Dokumentations-/Notizseite im Admin-Panel: freies Textfeld, in dem
// Zugangsdaten (Supabase, GitHub, Vercel, Admin-Passwort, etc.) hinterlegt
// werden können, damit ein Nachfolger sich zurechtfindet. Rein informativ -
// die App selbst greift nicht auf diese Werte zu, es ist nur Text im
// LocalStorage.
// ----------------------------------------------------------------------------

const STORAGE_KEY = "lehrlingsapp_zugangsdaten_notizen";

const PLATZHALTER_TEXT = `Hier kannst du alle wichtigen Zugangsdaten und Links notieren, damit sich
auch jemand anderes zurechtfindet, falls du mal nicht verfügbar bist.

Beispiel-Struktur (einfach überschreiben):

--- GitHub ---
Repository: https://github.com/nikidanninger-stack/lehrlingsapp
Account: ...
Passwort/Zugang: ...

--- Vercel (Hosting) ---
Projekt-Link: https://lehrlingsapp.vercel.app
Vercel-Dashboard: https://vercel.com/dashboard
Account: ...

--- Supabase (Datenbank, falls eingerichtet) ---
Projekt-URL: ...
Anon Key: ...
Account: ...

--- Admin-Zugang der App ---
Admin-Passwort: hauser2024

--- Sonstiges ---
...`;

export function AdminZugangsdaten() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    setText(existing ?? "");
  }, []);

  function handleChange(value: string) {
    setText(value);
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, text);
    setSaved(true);
    toast.success("Zugangsdaten gespeichert");
  }

  return (
    <GlassCard>
      <SectionHeader
        icon={<KeyRound size={22} />}
        title="Zugangsdaten & Notizen"
        subtitle="Wichtige Zugänge und Links für Nachfolger dokumentieren"
      />
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Diese Notizen werden nur lokal in diesem Browser gespeichert (nicht
          serverseitig synchronisiert). Am besten zusätzlich an einem
          sicheren Ort außerhalb der App aufbewahren, z.B. in einem
          Passwort-Manager.
        </div>
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={PLATZHALTER_TEXT}
          className="input min-h-[400px] font-mono text-xs leading-relaxed whitespace-pre-wrap"
        />
        <Button onClick={handleSave} disabled={saved} icon={<Save size={16} />}>
          {saved ? "Gespeichert" : "Speichern"}
        </Button>
      </div>
    </GlassCard>
  );
}
