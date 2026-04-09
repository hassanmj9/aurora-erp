import Link from "next/link";
import { cn } from "@/lib/utils-client";

interface SerialTagProps {
  serial: string;
  size?: "sm" | "md" | "lg";
  clickable?: boolean;
  className?: string;
}

export function SerialTag({
  serial,
  size = "md",
  clickable = true,
  className,
}: SerialTagProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const baseClasses = cn(
    "inline-flex items-center gap-2 rounded-md font-mono font-semibold border-2 border-[#e94560] bg-white text-[#1a1a2e] hover:bg-gray-50 transition-colors",
    sizeClasses[size],
    className
  );

  const content = (
    <>
      <span className="text-[#e94560] font-bold">#</span>
      <span>{serial}</span>
    </>
  );

  if (!clickable) {
    return <div className={baseClasses}>{content}</div>;
  }

  return (
    <Link href={`/instrumentos/${serial}`} className={baseClasses}>
      {content}
    </Link>
  );
}
