import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, MessageCircleQuestion, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage } from "../types";
import { DataStore } from "../data/store";
import { callClaude } from "../api/claude";
import { Button } from "./ui/Button";

// ----------------------------------------------------------------------------
// Schwebender Mini-Chatbot, der Fragen auf Basis der Leitfaden-Inhalte
// beantwortet. Nutzt denselben Claude API-Key wie der Haupt-Chatbot.
// ----------------------------------------------------------------------------

export function LeitfadenChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function buildSystemPrompt(): string {
    const eintraege = DataStore.getLeitfadenEintraege();
    const kontext = eintraege
      .map((e) => `## ${e.titel} (${e.kategorie})\n${e.inhalt.replace(/<[^>]+>/g, " ")}`)
      .join("\n\n");
    return `Du bist ein Assistent, der ausschließlich Fragen zum Lehrlingsleitfaden von
Hauser Kältetechnik beantwortet. Nutze NUR die folgenden Leitfaden-Inhalte als Wissensbasis
und antworte kurz und präzise auf Deutsch. Wenn eine Frage nicht durch den Leitfaden abgedeckt
ist, sag das ehrlich.\n\n${kontext}`;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const apiKey = DataStore.getChatbotApiKeyLocal();
    if (!apiKey) {
      toast.error("Kein API-Key hinterlegt. Bitte Admin kontaktieren.");
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const reply = await callClaude({
        apiKey,
        systemPrompt: buildSystemPrompt(),
        history: next,
        userMessage: text,
      });
      setMessages([
        ...next,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Senden.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      {/* Schwebender Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Leitfaden-Assistent öffnen"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-110 transition-transform duration-300"
      >
        {open ? <X size={22} /> : <MessageCircleQuestion size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-3 flex items-center gap-2">
            <Bot size={18} />
            <span className="font-semibold text-sm">Leitfaden-Assistent</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8">
                Frag mich etwas zum Lehrlingsleitfaden.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <Loader2 size={12} className="animate-spin" /> Antwort wird generiert…
              </div>
            )}
          </div>

          <div className="p-2.5 border-t border-gray-100 flex items-end gap-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Frage stellen…"
              rows={1}
              className="input flex-1 text-xs resize-none py-2"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              icon={<Send size={14} />}
            >
              <span className="sr-only">Senden</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
