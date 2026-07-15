import { useState } from "react";
import {
  ShieldCheck,
  Users,
  FileSpreadsheet,
  CalendarClock,
  Contact,
  Wrench,
  BookOpen,
  GraduationCap,
  Database,
} from "lucide-react";
import type { User } from "../types";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { AdminLehrlingeTab } from "./AdminLehrlingeTab";
import { AdminStundenzettelUpload } from "./AdminStundenzettelUpload";
import { AdminDatenManagementTab } from "./AdminDatenManagementTab";
import { Termine } from "./Termine";
import { Ansprechpartner } from "./Ansprechpartner";
import { Werkzeugkatalog } from "./Werkzeugkatalog";
import { Lehrlingsleitfaden } from "./Lehrlingsleitfaden";
import { AdminLernverwaltung } from "./AdminLernverwaltung";

interface AdminPanelProps {
  user: User;
}

type Tab =
  | "lehrlinge"
  | "upload"
  | "termine"
  | "ansprechpartner"
  | "werkzeuge"
  | "leitfaden"
  | "lernverwaltung"
  | "daten";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "lehrlinge", label: "Lehrlinge", icon: Users },
  { id: "upload", label: "Excel/CSV-Import", icon: FileSpreadsheet },
  { id: "termine", label: "Termine", icon: CalendarClock },
  { id: "ansprechpartner", label: "Ansprechpartner", icon: Contact },
  { id: "werkzeuge", label: "Werkzeuge", icon: Wrench },
  { id: "leitfaden", label: "Leitfaden", icon: BookOpen },
  { id: "lernverwaltung", label: "Lernverwaltung", icon: GraduationCap },
  { id: "daten", label: "Daten-Management", icon: Database },
];

export function AdminPanel({ user }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>("lehrlinge");

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<ShieldCheck size={22} />}
          title="Admin-Panel"
          subtitle="Zentrale Verwaltung aller App-Inhalte"
        />
        <div className="px-6 pt-4 flex gap-1 overflow-x-auto scroll-thin border-b border-gray-100">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="p-6">
          {tab === "lehrlinge" && <AdminLehrlingeTab />}
          {tab === "upload" && <AdminStundenzettelUpload />}
          {tab === "termine" && <Termine user={user} />}
          {tab === "ansprechpartner" && <Ansprechpartner user={user} />}
          {tab === "werkzeuge" && <Werkzeugkatalog user={user} />}
          {tab === "leitfaden" && <Lehrlingsleitfaden user={user} />}
          {tab === "lernverwaltung" && <AdminLernverwaltung />}
          {tab === "daten" && <AdminDatenManagementTab />}
        </div>
      </GlassCard>
    </div>
  );
}
