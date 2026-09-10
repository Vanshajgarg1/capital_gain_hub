"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  LogOut,
  ShieldAlert,
  LifeBuoy
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const adminLinks = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Global Website", href: "/admin/website", icon: Globe },
  { name: "Programs", href: "/admin/courses", icon: BookOpen },
  { name: "Modules", href: "/admin/modules", icon: Layers },
  { name: "Video Lessons", href: "/admin/lessons", icon: FileVideo },
  { name: "Users & Students", href: "/admin/students", icon: Users },
  { name: "Transactions", href: "/admin/payments", icon: CreditCard },
  { name: "Metrics", href: "/admin/analytics", icon: BarChart },
  { name: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
  { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { name: "Knowledge Base", href: "/admin/faq", icon: HelpCircle },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-72 border-r border-white/10 bg-black/80 backdrop-blur-3xl h-screen sticky top-0 hidden md:flex flex-col shadow-2xl relative overflow-hidden z-20">
      {/* Decorative Command Center gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />

      <div className="p-6 relative z-10 border-b border-white/10 bg-black/20">
        <Link href="/" className="flex items-center gap-3 group w-fit">
          <div className="bg-cyan-500/10 p-2.5 rounded-xl group-hover:bg-cyan-500/20 transition-all duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/30 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tighter truncate text-white leading-none">
              COMMAND <span className="text-cyan-400">CENTER</span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Admin Privileges</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto relative z-10 scrollbar-hide">
        <p className="px-4 text-[10px] font-black text-cyan-500/80 uppercase tracking-[0.2em] mb-4">
          Management
        </p>
        {adminLinks.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/admin");
          return (
            <Link key={link.name} href={link.href}>
              <div className="relative group px-2 py-1">
                {isActive && (
                  <motion.div 
                    layoutId="active-admin-item"
                    className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/30 rounded-xl shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={cn(
                  "relative flex items-center px-3 py-2 rounded-xl transition-colors z-10",
                  isActive ? "text-cyan-400" : "text-muted-foreground hover:text-white"
                )}>
                  <link.icon className={cn("mr-3 h-4 w-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="font-medium text-sm tracking-wide">{link.name}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10 relative z-10 bg-black/40">
        <div className="px-2 py-1">
          <button 
            onClick={signOut}
            className="w-full relative flex items-center px-3 py-2 rounded-xl transition-colors z-10 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 group font-medium text-sm"
          >
            <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
            Terminate Session
          </button>
        </div>
      </div>
    </aside>
  );
}
