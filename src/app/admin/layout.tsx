import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const metadata = {
  title: "Admin Panel | Capital Gain Hub",
  description: "Platform management",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAuth={true} requireRole="ADMIN">
      <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-muted/20">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
