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
} from "lucide-react";
import type { Screen, UserRole } from "../types";

export interface NavItem {
  screen: Screen;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const lehrlingNav: NavItem[] = [
  { screen: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "lernapp", label: "Lernen", icon: GraduationCap },
  { screen: "lehrlingsplan", label: "Lehrlingsplan", icon: CalendarDays },
  { screen: "termine", label: "Termine", icon: CalendarClock },
  { screen: "krankmeldung", label: "Krankmeldung", icon: Stethoscope },
  { screen: "ansprechpartner", label: "Ansprechpartner", icon: Users },
  { screen: "leitfaden", label: "Leitfaden", icon: BookOpen },
  { screen: "werkzeug", label: "Werkzeuge", icon: Wrench },
  { screen: "profil", label: "Profil", icon: UserCircle },
];

const adminNav: NavItem[] = [
  { screen: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { screen: "jahresplanung", label: "Jahresplanung", icon: BarChart3 },
  { screen: "chatbot", label: "Chatbot", icon: Bot },
  { screen: "lernapp", label: "Lernapp", icon: GraduationCap },
  { screen: "admin", label: "Admin", icon: ShieldCheck },
  { screen: "lehrlingsplan", label: "Lehrlingsplan", icon: CalendarDays },
  { screen: "termine", label: "Termine", icon: CalendarClock },
  { screen: "ansprechpartner", label: "Ansprechpartner", icon: Users },
  { screen: "leitfaden", label: "Leitfaden", icon: BookOpen },
  { screen: "werkzeug", label: "Werkzeuge", icon: Wrench },
  { screen: "profil", label: "Profil", icon: UserCircle },
];

export function getNavItems(role: UserRole): NavItem[] {
  return role === "admin" ? adminNav : lehrlingNav;
}
