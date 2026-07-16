import type { ComponentType } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Stethoscope,
  Users,
  BookOpen,
  Wrench,
  UserCircle,
  ShieldCheck,
  Bot,
  BarChart3,
  GraduationCap,
  Clock,
} from "lucide-react";
import type { Screen, UserRole } from "../types";

export interface NavItem {
  screen: Screen;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  // Nicht mehr aktiv genutzt (Stundenzettel ist jetzt ein interner Screen,
  // siehe StundenzettelScreen.tsx). Feld bleibt bestehen, falls man später
  // wieder zu einem rein externen Link (neuer Tab) zurückwechseln möchte.
  externalUrl?: string;
}

// Lehrling behält "Termine" (automatische Ausbildungsplan-Übersicht der
// bevorstehenden Abschnitte, siehe LehrlingTermineUebersicht.tsx).
// "Chatbot" fehlt hier bewusst - wird nur bedingt (siehe getNavItems)
// hinzugefügt, sobald ein OpenAI-API-Key vom Admin hinterlegt wurde.
const lehrlingNavBase: NavItem[] = [
  { screen: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "lernapp", label: "Lernen", icon: GraduationCap },
  { screen: "lehrlingsplan", label: "Lehrlingsplan", icon: CalendarDays },
  { screen: "termine", label: "Termine", icon: CalendarClock },
  { screen: "krankmeldung", label: "Krankmeldung", icon: Stethoscope },
  { screen: "stundenzettel", label: "Stundenzettel", icon: Clock },
  { screen: "ansprechpartner", label: "Ansprechpartner", icon: Users },
  { screen: "leitfaden", label: "Leitfaden", icon: BookOpen },
  { screen: "werkzeug", label: "Werkzeuge", icon: Wrench },
  { screen: "profil", label: "Profil", icon: UserCircle },
];

const chatbotNavItem: NavItem = {
  screen: "chatbot",
  label: "Chatbot",
  icon: Bot,
};

// Admin hat KEIN "Termine" mehr (die alte Prüfungs-/Ausflugsverwaltung wurde
// entfernt). Admin sieht "Chatbot" immer, unabhängig vom Freischalt-Status,
// damit er den API-Key testen kann, bevor er ihn für Lehrlinge freigibt.
const adminNav: NavItem[] = [
  { screen: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "jahresplanung", label: "Jahresplanung", icon: BarChart3 },
  { screen: "chatbot", label: "Chatbot", icon: Bot },
  { screen: "lernapp", label: "Lernapp", icon: GraduationCap },
  { screen: "admin", label: "Admin", icon: ShieldCheck },
  { screen: "lehrlingsplan", label: "Lehrlingsplan", icon: CalendarDays },
  { screen: "stundenzettel", label: "Stundenzettel", icon: Clock },
  { screen: "ansprechpartner", label: "Ansprechpartner", icon: Users },
  { screen: "leitfaden", label: "Leitfaden", icon: BookOpen },
  { screen: "werkzeug", label: "Werkzeuge", icon: Wrench },
  { screen: "profil", label: "Profil", icon: UserCircle },
];

// chatbotEnabledForLehrlinge: wird vom Admin über einen Schalter (im
// Admin-Zugangsdaten-Bereich) gesetzt, sobald ein gültiger OpenAI-API-Key
// hinterlegt ist. Solange false, sehen Lehrlinge den Menüpunkt "Chatbot" gar
// nicht.
export function getNavItems(
  role: UserRole,
  chatbotEnabledForLehrlinge = false,
): NavItem[] {
  if (role === "admin") return adminNav;

  return chatbotEnabledForLehrlinge
    ? [...lehrlingNavBase.slice(0, 2), chatbotNavItem, ...lehrlingNavBase.slice(2)]
    : lehrlingNavBase;
}
