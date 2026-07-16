import { useEffect, useState } from "react";
import { KeyRound, Save, Bot } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import {
  isChatbotEnabledForLehrlinge,
  setChatbotEnabledForLehrlinge,
} from "./Sidebar";
import { notifyDataChange } from "../data/store";

// ----------------------------------------------------------------------------
// AdminZugangsdaten
//
// Reine Dokumentations-/Notizseite im Admin-Panel: freies Textfeld, in dem
// Zugangsdaten (Supabase, GitHub, Vercel, Admin-Passwort, etc.) hinterlegt
// werden können, damit ein Nachfolger sich zurechtfindet. Rein informativ -
// die App selbst greift nicht auf diese Werte zu, es ist nur Text im
// LocalStorage.
//
// Zusätzlich: Schalter, um den Chatbot für Lehrlinge freizugeben. Solange
// noch kein OpenAI-API-Key hinterlegt/getestet wurde, bleibt der Chatbot für
// Lehrlinge unsichtbar (Admin sieht ihn zum Testen trotzdem immer).
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

--- Supabase (Datenbank) ---
Projekt-URL: https://babizkwevswcwlmpyxkj.supabase.co
Anon/Publishable Key: ...
Account: ...

--- Admin-Zugang der App ---
Benutzername: admin
Admin-Passwort: ...

--- Sonstiges ---
...`;

export function AdminZugangsdaten() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);
  const [chatbotEnabled, setChatbotEnabled] = useState(() =>
    isChatbotEnabledForLehrlinge(),
  );

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

  function handleToggleChatbot() {
    const next = !chatbotEnabled;
    setChatbotEnabledForLehrlinge(next);
    setChatbotEnabled(next);
    notifyDataChange();
    toast.success(
      next
        ? "Chatbot für Lehrlinge freigegeben"
        : "Chatbot für Lehrlinge wieder deaktiviert",
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<Bot size={22} />}
          title="Chatbot-Freigabe"
          subtitle="Chatbot für Lehrlinge sichtbar machen, sobald ein API-Key hinterlegt/getestet wurde"
        />
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white/60 p-4">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Chatbot für Lehrlinge anzeigen
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Solange deaktiviert, sehen Lehrlinge den Menüpunkt
                "Chatbot" nicht. Als Admin siehst du ihn immer, unabhängig
                von diesem Schalter.
              </p>
            </div>
            <button
              onClick={handleToggleChatbot}
              role="switch"
              aria-checked={chatbotEnabled}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
                chatbotEnabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  chatbotEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </GlassCard>

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
    </div>
  );
}
