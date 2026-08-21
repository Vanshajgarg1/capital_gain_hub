"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Globe,
  BookOpen,
  Layers,
  FileVideo,
  Users,
  CreditCard,
  BarChart,
  MessageSquareQuote,
  HelpCircle,
  Settings,
  TrendingUp,
  LogOut
} from "lucide-react";

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Website", href: "/admin/website", icon: Globe },
  { name: "Courses", href: "/admin/courses", icon: BookOpen },
  { name: "Modules", href: "/admin/modules", icon: Layers },
  { name: "Lessons", href: "/admin/lessons", icon: FileVideo },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart },
  { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { name: "FAQ", href: "/admin/faq", icon: HelpCircle },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border/50 bg-background/95 backdrop-blur-xl h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-colors border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight truncate">
            ADMIN <span className="text-primary">PANEL</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
          Management
        </p>
        {adminLinks.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/admin");
          return (
            <Link key={link.name} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start font-medium mb-1", 
                  isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"
                )}
                size="sm"
              >
                <link.icon className="mr-3 h-4 w-4" />
                {link.name}
              </Button>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" size="sm">
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
