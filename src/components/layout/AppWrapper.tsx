"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { captureUtmParams } from "@/lib/utm";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = !pathname?.startsWith("/dashboard") && !pathname?.startsWith("/admin");

  // Capture UTM parameters on initial landing (runs on mount/navigation)
  useEffect(() => {
    captureUtmParams();
  }, [pathname]);

  return (
    <AuthProvider>
      {isPublicRoute && <Navbar />}
      <main className={`flex-1 ${isPublicRoute ? 'pt-20' : ''}`}>
        {children}
      </main>
      {isPublicRoute && <Footer />}
    </AuthProvider>
  );
}
