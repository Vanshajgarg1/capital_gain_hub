"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = !pathname?.startsWith("/dashboard") && !pathname?.startsWith("/admin");

  return (
    <>
      {isPublicRoute && <Navbar />}
      <main className={`flex-1 ${isPublicRoute ? 'pt-20' : ''}`}>
        {children}
      </main>
      {isPublicRoute && <Footer />}
    </>
  );
}
