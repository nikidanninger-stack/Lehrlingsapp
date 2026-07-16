import { X, ExternalLink } from "lucide-react";
import type { Screen, UserRole } from "../types";
import { getNavItems } from "./navConfig";
import { HAUSER_LOGO_DATA_URL } from "../assets/hauserLogo";

interface SidebarProps {
  role: UserRole;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

// Öffnet einen externen Link garantiert in einem separaten Fenster/Tab, statt
// die aktuelle LehrlingsApp-Ansicht zu ersetzen. window.open() mit "_blank"
// funktioniert zuverlässiger als ein <a target="_blank"> insbesondere in als
// PWA installierten Apps auf iOS, wo <a target="_blank"> manchmal die
// aktuelle Ansicht ersetzt statt ein neues Fenster zu öffnen.
function openExternalInNewWindow(url: string) {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  // Falls das Popup blockiert wurde, als Fallback im aktuellen Tab öffnen,
  // damit der Link trotzdem funktioniert (besser als gar nichts).
  if (!win) {
    window.location.href = url;
  }
}

export function Sidebar({
  role,
  activeScreen,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems = getNavItems(role);

  function handleNavigate(screen: Screen) {
    onNavigate(screen);
    onCloseMobile();
  }

  const navList = (
    <nav className="flex-1 overflow-y-auto scroll-thin py-4 px-3 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;

        // Externe Links (z.B. Stundenzettel) öffnen garantiert in einem
        // separaten Fenster/Tab, damit die LehrlingsApp im Hintergrund
        // bestehen bleibt und man jederzeit zurückkommen kann.
        if (item.externalUrl) {
          const url = item.externalUrl;
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => openExternalInNewWindow(url)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Icon size={18} />
              {item.label}
              <ExternalLink size={13} className="ml-auto text-gray-400" />
            </button>
          );
        }

        const isActive = activeScreen === item.screen;
        return (
          <button
            key={item.screen}
            onClick={() => handleNavigate(item.screen as Screen)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-30">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
          <img src={HAUSER_LOGO_DATA_URL} alt="Hauser" className="h-6 w-auto" />
          <span className="font-bold text-gray-800">LehrlingsApp</span>
        </div>
        {navList}
      </aside>

      {/* Mobile Overlay + Slide-in Sidebar */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onCloseMobile}
          role="presentation"
        />
      )}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-72 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
          <div className="flex items-center gap-2">
            <img src={HAUSER_LOGO_DATA_URL} alt="Hauser" className="h-6 w-auto bg-white rounded px-1 py-0.5" />
            <span className="font-bold">LehrlingsApp</span>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Menü schließen"
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {navList}
      </aside>
    </>
  );
}
