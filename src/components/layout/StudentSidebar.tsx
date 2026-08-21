"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BookOpen,
  Map,
  Trophy,
  UserCircle,
  LifeBuoy,
  LogOut,
  TrendingUp,
} from "lucide-react";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Courses", href: "/dashboard/courses", icon: BookOpen },
  { name: "Learning Path", href: "/dashboard/path", icon: Map },
  { name: "Certificates", href: "/dashboard/certificates", icon: Trophy },
];

const bottomLinks = [
  { name: "Profile", href: "/dashboard/profile", icon: UserCircle },
  { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

export function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight truncate">
            CAPITAL GAIN <span className="text-primary">HUB</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Learning
          </p>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.name} href={link.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start font-medium", isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground")}
                >
                  <link.icon className="mr-3 h-5 w-5" />
                  {link.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-border/50 space-y-1">
        {bottomLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.name} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start font-medium", isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground")}
              >
                <link.icon className="mr-3 h-5 w-5" />
                {link.name}
              </Button>
            </Link>
          );
        })}
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <LogOut className="mr-3 h-5 w-5" />
          Log Out
        </Button>
      </div>
    </aside>
  );
}
