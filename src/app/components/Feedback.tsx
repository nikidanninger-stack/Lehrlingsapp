import { useState } from "react";
import { Lightbulb, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../types";
import { Button } from "./ui/Button";

interface FeedbackProps {
  user: User;
}

export function Feedback({ user }: FeedbackProps) {
  const [nachricht, setNachricht] = useState("");
  const [name, setName] = useState("");
  const [anonym, setAnonym] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nachricht.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nachricht: nachricht.trim(),
          name: anonym ? null : (name.trim() || user.name),
          personalnummer: user.personalnummer,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Unbekannter Fehler");
      }
      setSent(true);
      toast.success("Deine Nachricht wurde gesendet!");
    } catch (err: unknown) {
      toast.error("Fehler: " + (err instanceof Error ? err.message : "Bitte erneut versuchen."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-10 text-center max-w-lg mx-auto">
        <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Danke für dein Feedback!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Deine Idee wurde direkt ans Büro weitergeleitet.
        </p>
        <button onClick={() => { setNachricht(""); setName(""); setAnonym(true); setSent(false); }}
          className="text-blue-600 text-sm font-medium hover:underline">
          Weitere Idee einreichen
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb size={28} />
          <h1 className="text-2xl font-bold">Verbesserungsideen & Wünsche</h1>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed">
          Schreib hier anonym (oder mit deinem Namen) deine Ideen und Wünsche zur Lehrlingsausbildung.
          Deine Nachricht geht direkt ans Büro – wir versuchen alles bestmöglich umzusetzen!
        </p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Anonym senden</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {anonym ? "Dein Name wird nicht mitgeschickt" : "Dein Name wird sichtbar sein"}
              </p>
            </div>
            <button type="button" onClick={() => setAnonym(!anonym)}
              className={"relative w-12 h-6 rounded-full transition-colors duration-200 " + (anonym ? "bg-blue-600" : "bg-gray-300")}>
              <span className={"absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 " + (anonym ? "translate-x-6" : "translate-x-0")} />
            </button>
          </div>

          {!anonym && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dein Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={user.name}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Deine Idee / dein Wunsch <span className="text-red-400">*</span>
            </label>
            <textarea value={nachricht} onChange={(e) => setNachricht(e.target.value)}
              placeholder="z.B. Ich würde mir wünschen, dass..."
              rows={6} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm resize-none" />
            <p className="text-xs text-gray-400 mt-1">{nachricht.length} Zeichen</p>
          </div>

          <Button type="submit" disabled={loading || !nachricht.trim()} className="w-full flex items-center justify-center gap-2">
            <Send size={16} />
            {loading ? "Wird gesendet…" : "Idee einreichen"}
          </Button>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
        <strong>Hinweis:</strong> Alle Ideen werden direkt ans Büro weitergeleitet und ernst genommen.
      </div>
    </div>
  );
}
