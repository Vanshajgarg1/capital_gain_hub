"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Lock, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const authDiagnostic = supabase.auth as unknown as {
      isDetectSessionInUrl?: boolean;
      clientOptions?: {
        flowType?: string;
        persistSession?: boolean;
        autoRefreshToken?: boolean;
      };
    };

    console.log("[DIAGNOSTIC] Client config:", {
      detectSessionInUrl: authDiagnostic.isDetectSessionInUrl,
      flowType: authDiagnostic.clientOptions?.flowType,
      persistSession: authDiagnostic.clientOptions?.persistSession,
      autoRefreshToken: authDiagnostic.clientOptions?.autoRefreshToken
    });
    console.log("[DIAGNOSTIC] Page Mounted. URL:", window.location.href.replace(/([#?&]access_token=)[^&]+/, '$1[HIDDEN]').replace(/([#?&]refresh_token=)[^&]+/, '$1[HIDDEN]').replace(/([#?&]code=)[^&]+/, '$1[HIDDEN]'));
    
    let urlError = "";
    if (typeof window !== "undefined") {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      console.log("[DIAGNOSTIC] Hash params present:", Array.from(hashParams.keys()));
      console.log("[DIAGNOSTIC] Query params present:", Array.from(queryParams.keys()));

      const err = hashParams.get("error") || queryParams.get("error");
      const errDesc = hashParams.get("error_description") || queryParams.get("error_description");
      
      if (err) {
        console.error("[DIAGNOSTIC] URL Error detected:", err, errDesc);
        urlError = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : err;
        setSessionError(urlError);
        setIsVerifying(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    if (!urlError) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log("[DIAGNOSTIC] Initial getSession result. Has session:", !!session);
        if (session) {
          setIsVerifying(false);
        } else {
          // Give onAuthStateChange time to process implicit hash or PKCE exchange
          setTimeout(async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            console.log("[DIAGNOSTIC] Timeout getSession result. Has session:", !!currentSession);
            if (!currentSession) {
              setSessionError((prev) => prev || "No active recovery session found. Please request a new link.");
              setIsVerifying(false);
            }
          }, 1500);
        }
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[DIAGNOSTIC] Auth state changed. Event:", event, "Has session:", !!session);
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsVerifying(false);
        setSessionError("");
      } else if (event === 'SIGNED_OUT') {
        setIsVerifying(false);
        setSessionError("Session ended. Please request a new link.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Your link may have expired.");
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
              Secure your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Command Center</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed">
              Create a new, strong password to ensure your account and trading data remain secure.
            </p>
          </motion.div>
          
          <div className="mt-12 flex items-center gap-4 text-sm font-bold tracking-wider uppercase text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Encrypted Update
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Minimum 8 characters
            </div>
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
            <h2 className="text-3xl font-black tracking-tighter mb-2">Reset your password</h2>
            <p className="text-muted-foreground">Welcome back to Capital Gain Hub. You can change your password here.</p>
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
              <h3 className="text-xl font-bold">Password updated successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Button onClick={() => router.push("/login")} className="w-full mt-4 h-12 bg-white/10 hover:bg-white/20 text-white">
                Continue to Login
              </Button>
            </motion.div>
          ) : isVerifying ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (!isVerifying && !sessionError && !success) ? (
            <form onSubmit={handleUpdate} className="space-y-5">
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
                <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">New Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password" 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Confirm Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(23,163,74,0.3)] hover:shadow-[0_0_30px_rgba(23,163,74,0.4)] transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {loading ? "Updating..." : (
                    <span className="flex items-center justify-center gap-2">
                      Update Password <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-center space-y-4"
            >
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400">Invalid or Expired Link</h3>
              <p className="text-sm text-muted-foreground">
                Your password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button onClick={() => router.push("/forgot-password")} className="w-full mt-4 h-12 bg-white/10 hover:bg-white/20 text-white">
                Request New Link
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
