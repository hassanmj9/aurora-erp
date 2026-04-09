import { ReactNode } from "react";
import { cn } from "@/lib/utils-client";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: ReactNode;
  };
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-8", className)}>
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>

      {action && (
        <>
          {action.href ? (
            <a
              href={action.href}
              className="flex items-center gap-2 px-4 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors whitespace-nowrap ml-4"
            >
              {action.icon && <span className="w-5 h-5">{action.icon}</span>}
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="flex items-center gap-2 px-4 py-2 bg-[#e94560] text-white rounded-lg font-medium hover:bg-[#d73a4f] transition-colors whitespace-nowrap ml-4"
            >
              {action.icon && <span className="w-5 h-5">{action.icon}</span>}
              {action.label}
            </button>
          )}
        </>
      )}
    </div>
  );
}
