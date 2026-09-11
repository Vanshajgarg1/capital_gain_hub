"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Mail, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-black relative overflow-hidden">
      
      {/* LEFT PANEL - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/5 flex-col justify-between p-12 z-10 bg-black/40 backdrop-blur-3xl">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay z-0" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/2 -translate-y-1/4" />
        
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] bg-[size:64px_64px] z-0" />
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(23,163,74,0.15)] group-hover:scale-105 transition-transform duration-300">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">CAPITAL GAIN HUB</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl font-black tracking-tighter leading-tight mb-6">
              Regain access to your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Command Center</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed">
              We'll send you a secure link to reset your password and get you back into the markets.
            </p>
          </motion.div>
          
          <div className="mt-12 flex items-center gap-4 text-sm font-bold tracking-wider uppercase text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Secure Recovery
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        
        {/* Mobile background elements */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 -translate-y-1/2" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]"
        >
          <div className="lg:hidden flex justify-center mb-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(23,163,74,0.15)]">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">CAPITAL GAIN HUB</span>
            </Link>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black tracking-tighter mb-2">Forgot Password</h2>
            <p className="text-muted-foreground">Enter your email address to receive a reset link.</p>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/10 border border-primary/20 text-primary-foreground p-6 rounded-xl text-center space-y-4"
            >
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <span className="text-white">{email}</span>. 
                Please check your inbox and spam folder.
              </p>
              <Link href="/login" className={cn(buttonVariants(), "w-full mt-4 h-12 bg-white/10 hover:bg-white/20 text-white")}>
                Return to Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email" 
                    type="email" 
                    required
                    placeholder="name@example.com" 
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(23,163,74,0.3)] hover:shadow-[0_0_30px_rgba(23,163,74,0.4)] transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {loading ? "Sending link..." : (
                    <span className="flex items-center justify-center gap-2">
                      Send Reset Link <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-10 text-center text-sm text-muted-foreground font-medium">
            Remembered your password?{" "}
            <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
              Return to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
