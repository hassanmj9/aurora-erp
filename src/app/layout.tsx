import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurora ERP",
  description: "Sistema de gestão para Aurora Violins",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#f8f9fa]">
        <Sidebar />

        {/* Main content area with left margin for sidebar */}
        <main className="lg:ml-64 min-h-screen">
          <div className="container-responsive py-8 mt-16 lg:mt-0">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
