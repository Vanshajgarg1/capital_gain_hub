"use client";

import { useState } from "react";
import Link from "next/link";
import { XCircle, ArrowRight, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function EmailVerificationFailedPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        }
      });

      if (error) throw error;
      
      setMessage({ type: "success", text: "Confirmation email sent! Please check your inbox." });
      setEmail(""); // clear input
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to resend email. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card border border-white/10 bg-black/40 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-md w-full text-center relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
      >
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-black tracking-tighter text-white mb-4">
          Email Verification Failed
        </h1>
        
        <p className="text-muted-foreground mb-8 text-base">
          The confirmation link is invalid or has expired. Please request a new confirmation email.
        </p>

        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleResend} className="space-y-4 mb-6">
          <div className="relative group text-left">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-white transition-colors" />
            <Input 
              type="email" 
              required
              placeholder="name@example.com" 
              className="pl-12 h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-white focus-visible:border-white text-base transition-all text-white" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-base font-bold bg-white text-black hover:bg-gray-200 transition-all group overflow-hidden relative">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <span className="flex items-center justify-center gap-2">
                Resend Confirmation Email <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </form>

        <div className="pt-6 border-t border-white/10">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "w-full h-12 rounded-xl text-sm font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-colors")}>
            Return to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
