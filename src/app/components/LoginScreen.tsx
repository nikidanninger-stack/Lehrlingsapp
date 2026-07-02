import { useState } from "react";
import { Snowflake, User as UserIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../types";
import { DataStore } from "../data/store";
import { Button } from "./ui/Button";

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const ADMIN_PASSWORD = "hauser2024";

type Mode = "lehrling" | "admin";

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("lehrling");
  const [personalnummer, setPersonalnummer] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleLehrlingLogin() {
    setError(null);
    const trimmed = personalnummer.trim();
    if (!trimmed) {
      setError("Bitte gib deine Personalnummer ein.");
      return;
    }
    setLoading(true);
    const lehrling = DataStore.findLehrling(trimmed);
    setLoading(false);

    if (!lehrling) {
      setError("Personalnummer nicht gefunden.");
      return;
    }

    const user: User = {
      id: lehrling.personalnummer,
      name: lehrling.name,
      personalnummer: lehrling.personalnummer,
      lehrjahr: lehrling.lehrjahr,
      role: "lehrling",
    };
    finishLogin(user);
  }

  function handleAdminLogin() {
    setError(null);
    if (!password) {
      setError("Bitte gib das Admin-Passwort ein.");
      return;
    }
    if (password !== ADMIN_PASSWORD) {
      setError("Falsches Passwort.");
      return;
    }
    const user: User = {
      id: "admin",
      name: "Administrator",
      personalnummer: "admin",
      lehrjahr: 0,
      role: "admin",
    };
    finishLogin(user);
  }

  function finishLogin(user: User) {
    onLogin(user);
    toast.success(`Willkommen, ${user.name}!`);

    // Donnerstags-Erinnerung an die Berufsschule
    if (new Date().getDay() === 4) {
      setTimeout(() => {
        toast.info(
          "Erinnerung: Nächste Woche Berufsschule – Denke an deine Unterlagen!",
        );
      }, 2000);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "lehrling") handleLehrlingLogin();
    else handleAdminLogin();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
              <Snowflake className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">LehrlingsApp</h1>
            <p className="text-gray-500 text-sm mt-1">Hauser Kältetechnik</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("lehrling");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "lehrling"
                  ? "bg-white shadow text-blue-700"
                  : "text-gray-500"
              }`}
            >
              <UserIcon size={16} />
              Lehrling
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("admin");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "admin"
                  ? "bg-white shadow text-blue-700"
                  : "text-gray-500"
              }`}
            >
              <ShieldCheck size={16} />
              Administrator
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "lehrling" ? (
              <div>
                <label
                  htmlFor="personalnummer"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Personalnummer
                </label>
                <input
                  id="personalnummer"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={personalnummer}
                  onChange={(e) => setPersonalnummer(e.target.value)}
                  placeholder="z.B. 12345"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Admin-Passwort
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {mode === "lehrling" ? "Als Lehrling anmelden" : "Als Admin anmelden"}
            </Button>
          </form>
        </div>
        <p className="text-center text-blue-200 text-xs mt-6">
          Deine digitale Ausbildungsplattform
        </p>
      </div>
    </div>
  );
}
