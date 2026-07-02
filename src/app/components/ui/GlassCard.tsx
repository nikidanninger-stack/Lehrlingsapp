import type { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  className = "",
  hoverEffect = false,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={`bg-white/70 backdrop-blur-xl border border-white/30 rounded-2xl shadow-xl ${
        hoverEffect
          ? "hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
