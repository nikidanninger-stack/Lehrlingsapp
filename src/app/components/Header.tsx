import { Menu, User as UserIcon } from "lucide-react";
import type { User } from "../types";
import { HAUSER_LOGO_DATA_URL } from "../assets/hauserLogo";

interface HeaderProps {
  user: User;
  onOpenMobileMenu: () => void;
}

export function Header({ user, onOpenMobileMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Menü öffnen"
          className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu size={22} />
        </button>

        <div className="flex-1 flex items-center justify-center lg:justify-start gap-3">
          <img
            src={HAUSER_LOGO_DATA_URL}
            alt="Hauser"
            className="h-7 w-auto bg-white rounded-md px-1.5 py-1 hidden sm:block"
          />
          <div className="text-center lg:text-left">
            <h1 className="text-white font-bold text-lg leading-tight">
              LehrlingsApp
            </h1>
            <p className="text-blue-200 text-xs leading-tight hidden sm:block">
              Deine digitale Ausbildungsplattform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/15 rounded-full pl-3 pr-1 py-1">
          <span className="hidden sm:block text-white text-sm font-medium">
            {user.name}
          </span>
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <UserIcon size={16} className="text-blue-700" />
          </div>
        </div>
      </div>
    </header>
  );
}
