import { ReactNode } from "react";
import { cn } from "@/lib/utils-client";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: {
    direction: "up" | "down";
    percentage: number;
  };
  variant?: "default" | "accent" | "warning" | "danger" | "info";
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  sublabel,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const baseClasses =
    "rounded-lg border p-6 flex flex-col justify-between h-full";

  const variantClasses = {
    default: "bg-white border-gray-200 shadow-sm",
    accent:
      "bg-gradient-to-br from-[#0f3460] to-[#1a1a2e] text-white border-0 shadow-md",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200",
    danger: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
    info: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
  };

  const textVariant = {
    default: "text-gray-700",
    accent: "text-white",
    warning: "text-amber-900",
    danger: "text-red-900",
    info: "text-blue-900",
  };

  const valueVariant = {
    default: "text-gray-900",
    accent: "text-white",
    warning: "text-amber-900",
    danger: "text-red-900",
    info: "text-blue-900",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "p-2 rounded-lg",
            variant === "default" && "bg-gray-100",
            variant === "accent" && "bg-white/20",
            variant === "warning" && "bg-amber-200/30",
            variant === "danger" && "bg-red-200/30",
            variant === "info" && "bg-blue-200/30"
          )}
        >
          <div
            className={cn(
              "w-6 h-6",
              variant === "default" && "text-[#e94560]",
              variant === "accent" && "text-white",
              variant === "warning" && "text-amber-900",
              variant === "danger" && "text-red-900",
              variant === "info" && "text-blue-900"
            )}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "text-sm font-medium",
              trend.direction === "up" && "text-green-600",
              trend.direction === "down" && "text-red-600"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.percentage}%
          </div>
        )}
      </div>

      <div>
        <p className={cn("text-sm mb-1", textVariant[variant])}>{label}</p>
        <p className={cn("text-3xl font-bold mb-2", valueVariant[variant])}>
          {value}
        </p>
        {sublabel && (
          <p className={cn("text-xs", textVariant[variant])}>{sublabel}</p>
        )}
      </div>
    </div>
  );
}
