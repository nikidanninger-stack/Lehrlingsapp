interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  gradientClassName?: string;
}

export function ProgressBar({
  value,
  className = "",
  gradientClassName = "bg-gradient-to-r from-blue-500 to-purple-600",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${gradientClassName}`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
