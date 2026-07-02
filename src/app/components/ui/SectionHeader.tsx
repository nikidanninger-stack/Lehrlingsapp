import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function SectionHeader({ icon, title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white px-6 py-5 rounded-t-2xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-blue-100 text-sm">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
