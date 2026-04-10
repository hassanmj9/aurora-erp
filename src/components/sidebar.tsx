"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Hash,
  ShoppingCart,
  Truck,
  Factory,
  DollarSign,
  Store,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils-client";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Instrumentos",
    href: "/instrumentos",
    icon: Hash,
  },
  {
    label: "Pedidos",
    href: "/pedidos",
    icon: ShoppingCart,
  },
  {
    label: "Envios",
    href: "/envios",
    icon: Truck,
  },
  {
    label: "Produção",
    href: "/producao",
    icon: Factory,
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
  },
  {
    label: "Shopify",
    href: "/shopify",
    icon: Store,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-[#1a1a2e] text-white rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-64 bg-[#1a1a2e] text-white transition-all duration-300 z-30",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">Aurora</span>
            <span className="text-lg font-bold text-[#e94560]">ERP</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-[#e94560] text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
