"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu, X, TrendingUp, User as UserIcon, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Courses", href: "/courses" },
    { name: "Learning Path", href: "/#learning-path" },
    { name: "About", href: "/about" },
    { name: "YouTube", href: "/#youtube" },
    { name: "FAQ", href: "/faq" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-500 border-b border-transparent",
        scrolled ? "bg-black/60 backdrop-blur-xl border-white/5 shadow-2xl py-2" : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(23,163,74,0.15)] group-hover:shadow-[0_0_25px_rgba(23,163,74,0.3)]">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <span className="font-extrabold text-xl md:text-2xl tracking-tighter">
            CAPITAL GAIN <span className="text-primary glow-text">HUB</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8 bg-white/5 px-8 py-3 rounded-full border border-white/5 backdrop-blur-md">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="relative group py-1"
            >
              <span className={cn(
                "text-sm font-semibold transition-colors duration-300 relative z-10",
                pathname === link.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {link.name}
              </span>
              {pathname === link.href && (
                <motion.div 
                  layoutId="navbar-indicator"
                  className="absolute inset-x-0 -bottom-2 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(23,163,74,0.5)]" 
                />
              )}
              <div className="absolute inset-x-0 -bottom-2 h-0.5 bg-white/20 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </Link>
          ))}
        </nav>

        {/* Desktop Auth & CTA */}
        <div className="hidden lg:flex items-center gap-4">
          {!user ? (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full px-6 font-semibold")}>
                  Log in
              </Link>
              <Link href="/courses">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(23,163,74,0.3)] hover:shadow-[0_0_30px_rgba(23,163,74,0.5)] transition-shadow px-6 py-2.5 rounded-full text-sm"
                >
                  Start Learning
                </motion.div>
              </Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "flex items-center gap-2 border-white/10 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-colors px-4")}>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <UserIcon className="h-3 w-3 text-primary" />
                </div>
                <span className="max-w-[120px] truncate font-semibold text-sm">{profile?.full_name || user.email}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-2xl border-white/10 rounded-2xl p-2 shadow-2xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold px-2 py-1.5">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  
                  {profile?.role === "ADMIN" ? (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-white/10 transition-colors py-2.5">
                        <Shield className="mr-3 h-4 w-4 text-primary" />
                        <span className="font-medium">Command Center</span>
                      </DropdownMenuItem>
                    </Link>
                  ) : (
                    <Link href="/dashboard">
                      <DropdownMenuItem className="cursor-pointer rounded-xl hover:bg-white/10 transition-colors py-2.5">
                        <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                        <span className="font-medium">Trading Dashboard</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 rounded-xl transition-colors py-2.5" onClick={signOut}>
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-medium">Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground bg-white/5 rounded-full border border-white/10"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-3xl border-b border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-6">
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-2xl font-black tracking-tight hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
              
              <div className="h-px bg-white/10 w-full" />
              
              <div className="flex flex-col gap-4">
                {!user ? (
                  <>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center h-14 rounded-xl text-lg font-bold border-white/20 bg-white/5")}>
                        Log in
                    </Link>
                    <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants({ variant: "default" }), "w-full justify-center h-14 rounded-xl text-lg font-bold shadow-[0_0_20px_rgba(23,163,74,0.3)]")}>
                        Start Learning
                    </Link>
                  </>
                ) : (
                  <>
                    {profile?.role === "ADMIN" ? (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center h-14 rounded-xl text-lg font-bold border-white/20 bg-white/5")}>
                          Command Center
                      </Link>
                    ) : (
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center h-14 rounded-xl text-lg font-bold border-white/20 bg-white/5")}>
                          Trading Dashboard
                      </Link>
                    )}
                    <Button 
                      variant="destructive" 
                      className="w-full justify-center h-14 rounded-xl text-lg font-bold"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
