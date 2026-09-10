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
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const sidebarLinks = [
  { name: "Terminal", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Library", href: "/dashboard/courses", icon: BookOpen },
  { name: "Journey", href: "/dashboard/path", icon: Map },
  { name: "Achievements", href: "/dashboard/certificates", icon: Trophy },
];

const bottomLinks = [
  { name: "Profile Settings", href: "/dashboard/profile", icon: UserCircle },
  { name: "Support Hub", href: "/dashboard/support", icon: LifeBuoy },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-3xl h-screen sticky top-0 hidden md:flex flex-col shadow-2xl relative overflow-hidden z-20">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="p-6 relative z-10 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group w-fit">
          <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(23,163,74,0.15)] border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="font-extrabold text-xl tracking-tighter truncate text-white">
            MARKET <span className="text-primary glow-text">EDGE</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-6 space-y-8 overflow-y-auto relative z-10 scrollbar-hide">
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
            Command Center
          </p>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.name} href={link.href}>
                <div className="relative group px-2 py-1">
                  {isActive && (
                    <motion.div 
                      layoutId="active-sidebar-item"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl shadow-[inset_0_0_20px_rgba(23,163,74,0.05)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={cn(
                    "relative flex items-center px-3 py-2.5 rounded-xl transition-colors z-10",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    <link.icon className={cn("mr-3 h-5 w-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                    <span className="font-semibold text-sm tracking-wide">{link.name}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-white/5 space-y-2 relative z-10 bg-black/20">
        {bottomLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.name} href={link.href}>
              <div className="relative group px-2 py-1">
                {isActive && (
                  <motion.div 
                    layoutId="active-sidebar-item"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                    initial={false}
                  />
                )}
                <div className={cn(
                  "relative flex items-center px-3 py-2.5 rounded-xl transition-colors z-10",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  <link.icon className={cn("mr-3 h-5 w-5", isActive ? "" : "group-hover:scale-110 transition-transform duration-300")} />
                  <span className="font-semibold text-sm">{link.name}</span>
                </div>
              </div>
            </Link>
          );
        })}
        <div className="px-2 py-1 mt-2">
          <button 
            onClick={signOut}
            className="w-full relative flex items-center px-3 py-2.5 rounded-xl transition-colors z-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 group font-semibold text-sm"
          >
            <LogOut className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
            Disconnect
          </button>
        </div>
      </div>
    </aside>
  );
}
