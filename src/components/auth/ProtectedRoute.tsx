"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: Role;
}

export function ProtectedRoute({ children, requireAuth = true, requireRole }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.push("/login");
      } else if (requireAuth && user && requireRole && profile?.role !== requireRole) {
        // Redirect based on what role they actually have
        if (profile?.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [user, profile, isLoading, requireAuth, requireRole, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="mt-4 text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requireAuth && user && requireRole && profile?.role !== requireRole) {
    return null;
  }

  return <>{children}</>;
}
