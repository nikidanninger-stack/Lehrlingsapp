import { useEffect, useRef, useState } from "react";
import { Bot, Send, User as UserIcon, Settings, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage, User } from "../types";
import { DataStore } from "../data/store";
import { callClaude } from "../api/claude";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";

interface ChatbotAssistantProps {
  user: User;
}

const SYSTEM_PROMPT = `Du bist der Assistent der "LehrlingsApp" von Hauser Kältetechnik, einem
österreichischen Unternehmen für Kältetechnik. Du hilfst Lehrlingen der Lehrjahre 1–4 sowie
Administratoren bei Fragen rund um ihre Ausbildung, den Ausbildungsplan, Termine, den
Lehrlingsleitfaden, Werkzeuge und generelle Fragen zur Kältetechnik-Lehre. Antworte freundlich,
kurz und auf Deutsch (österreichisches Deutsch bevorzugt).`;

export function ChatbotAssistant({ user }: ChatbotAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    DataStore.getChatbotHistoryLocal(),
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(DataStore.getChatbotApiKeyLocal());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const reply = await callClaude({
        apiKey,
        systemPrompt: SYSTEM_PROMPT,
        history: nextMessages,
        userMessage: text,
      });
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);
      void DataStore.saveChatbotHistory(finalMessages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Senden der Nachricht.");
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

  async function saveApiKey() {
    await DataStore.saveChatbotApiKey(apiKeyInput.trim());
    toast.success("API-Key gespeichert.");
    setShowSettings(false);
  }

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-col h-[70vh]">
        <SectionHeader
          icon={<Bot size={22} />}
          title="Chatbot-Assistent"
          subtitle="Frag mich alles rund um deine Ausbildung"
          actions={
            user.role === "admin" ? (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                aria-label="Einstellungen"
              >
                <Settings size={18} />
              </button>
            ) : undefined
          }
        />

        {showSettings && user.role === "admin" && (
          <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <KeyRound size={14} /> Claude API-Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                className="input flex-1"
              />
              <Button size="sm" onClick={saveApiKey}>
                Speichern
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Der Key wird lokal und (falls konfiguriert) in Supabase gespeichert. Er wird
              client-seitig für Chat-Anfragen verwendet.
            </p>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
              <Bot size={40} className="mb-3 text-blue-300" />
              <p className="text-sm">
                Stell mir eine Frage zu deiner Ausbildung, dem Plan oder Terminen.
              </p>
            </div>
          ) : (
            messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
          )}
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Antwort wird generiert…
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht eingeben…"
            rows={1}
            className="input flex-1 resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            icon={<Send size={16} />}
            className="shrink-0"
          >
            Senden
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shrink-0">
          <Bot size={16} />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm"
            : "bg-white/70 backdrop-blur-xl border border-white/30 text-gray-700 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
          <UserIcon size={16} />
        </div>
      )}
    </div>
  );
}
