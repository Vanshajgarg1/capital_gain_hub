import { StudentSidebar } from "@/components/layout/StudentSidebar";

export const metadata = {
  title: "Dashboard | Capital Gain Hub",
  description: "Student learning dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-h-screen relative">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
