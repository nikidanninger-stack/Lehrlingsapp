import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import type { Screen, User } from "./types";
import { DataStore } from "./data/store";
import { autoMigrate, fixLautDokumentZuLautVideo } from "./data/migrateData";
import { initializeLernabschnitte } from "./data/initialLernabschnitte";
import { seedInitialData } from "./data/seedInitialData";
import { createVerdichterKapitel } from "./utils/createVerdichterKapitel";
import { LoginScreen } from "./components/LoginScreen";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Lehrlingsplan } from "./components/Lehrlingsplan";
import { Termine } from "./components/Termine";
import { Krankmeldung } from "./components/Krankmeldung";
import { AdminPanel } from "./components/AdminPanel";
import { Ansprechpartner } from "./components/Ansprechpartner";
import { Werkzeugkatalog } from "./components/Werkzeugkatalog";
import { Lehrlingsleitfaden } from "./components/Lehrlingsleitfaden";
import { LernApp } from "./components/LernApp";
import { Profil } from "./components/Profil";
import { ChatbotAssistant } from "./components/ChatbotAssistant";
import { Jahresplanung } from "./components/Jahresplanung";
import { StundenzettelScreen } from "./components/StundenzettelScreen";

// Placeholder für noch nicht gebaute Screens (werden in kommenden Runden ergänzt)
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl p-10 text-center">
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm">
        Dieser Bereich wird in der nächsten Ausbaustufe ergänzt.
      </p>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function boot() {
      // 1. LocalStorage initialisieren (nur beim allerersten Start)
      DataStore.initialize();

      // 1b. Lehrlinge + Ausbildungsplan 2026/2027 importieren (nur falls leer).
      // WICHTIG: dieser Aufruf sorgt dafür, dass jedes neue Gerät die Daten
      // automatisch beim ersten Öffnen bekommt, ganz ohne Admin-Klick.
      try {
        await seedInitialData();
      } catch (err) {
        console.error("Automatischer Erstimport fehlgeschlagen:", err);
      }

      // 2. Daten migrieren
      autoMigrate();

      // 3. Lernabschnitte initialisieren (Modul 0)
      initializeLernabschnitte();

      // 4. Verdichter-Kapitel für 4. Lehrjahr
      createVerdichterKapitel();

      // 5. Textkorrektur
      fixLautDokumentZuLautVideo();

      // 6. Supabase-Daten laden (asynchron, App funktioniert auch offline)
      try {
        await DataStore.loadFromSupabase();
        await DataStore.loadLernAbschnitteFromSupabase();
        await DataStore.loadChatbotApiKeyFromSupabase();
        await DataStore.loadChatbotHistoryFromSupabase();
      } catch (err) {
        console.error("Supabase-Laden fehlgeschlagen (App läuft offline weiter):", err);
      }

      // 7. Wochenende-Einträge bereinigen
      try {
        await DataStore.cleanupWochenende();
      } catch (err) {
        console.error("Wochenende-Bereinigung fehlgeschlagen:", err);
      }

      setReady(true);
    }
    void boot();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={setUser} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  function handleLogout() {
    setUser(null);
    setScreen("dashboard");
  }

  // Stundenzettel wird als eigener Vollbild-Screen mit Zurück-Button
  // gerendert (eingebettetes iframe), nicht innerhalb des normalen Layouts.
  // So bleibt die LehrlingsApp jederzeit sichtbar erreichbar - wichtig auf
  // iOS-PWAs, wo ein externer Link (target="_blank") die App sonst ersetzt.
  if (screen === "stundenzettel") {
    return (
      <>
        <StundenzettelScreen onBack={() => setScreen("dashboard")} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  function renderScreen() {
    if (!user) return null;
    switch (screen) {
      case "dashboard":
        return <Dashboard user={user} onNavigate={setScreen} />;
      case "lehrlingsplan":
        return <Lehrlingsplan user={user} />;
      case "termine":
        return <Termine user={user} />;
      case "krankmeldung":
        return <Krankmeldung user={user} />;
      case "ansprechpartner":
        return <Ansprechpartner user={user} />;
      case "leitfaden":
        return <Lehrlingsleitfaden user={user} />;
      case "werkzeug":
        return <Werkzeugkatalog user={user} />;
      case "profil":
        return <Profil user={user} onLogout={handleLogout} />;
      case "admin":
        return user.role === "admin" ? (
          <AdminPanel user={user} />
        ) : (
          <ComingSoon title="Kein Zugriff" />
        );
      case "chatbot":
        return <ChatbotAssistant user={user} />;
      case "jahresplanung":
        return user.role === "admin" ? (
          <Jahresplanung />
        ) : (
          <ComingSoon title="Kein Zugriff" />
        );
      case "lernapp":
        return <LernApp user={user} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      <Sidebar
        role={user.role}
        activeScreen={screen}
        onNavigate={setScreen}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="lg:ml-64">
        <Header user={user} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="max-w-7xl mx-auto px-4 py-6">{renderScreen()}</main>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
