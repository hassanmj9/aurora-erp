import { cn } from "@/lib/utils-client";

interface StatusBadgeProps {
  label: string;
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "secondary";
  className?: string;
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800 border-gray-200",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    secondary: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const dotVariant = {
    default: "bg-gray-400",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
    secondary: "bg-purple-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", dotVariant[variant])} />
      {label}
    </span>
  );
}
