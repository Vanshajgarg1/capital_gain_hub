"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmailConfirmedPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card border border-white/10 bg-black/40 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-md w-full text-center relative z-10 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
      >
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        
        <h1 className="text-3xl font-black tracking-tighter text-white mb-4">
          Email Verified Successfully
        </h1>
        
        <p className="text-muted-foreground mb-8 text-base">
          Your Capital Gain Hub account is now active. You can now log in and start learning.
        </p>

        <div className="space-y-4">
          <Link href="/login" className={cn(buttonVariants({ variant: "default" }), "w-full h-14 rounded-xl text-base font-bold bg-white text-black hover:bg-gray-200 transition-all group overflow-hidden relative")}>
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center justify-center gap-2">
              Login to Capital Gain Hub <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "w-full h-14 rounded-xl text-base font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-colors")}>
            Go to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
