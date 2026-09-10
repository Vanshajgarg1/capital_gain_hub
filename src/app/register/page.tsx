"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    const normalizedPhone = phone.replace(/[^\d+]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      return setError("Please enter a valid phone number with country code.");
    }

    setLoading(true);

    try {
      // Clear any existing session to prevent falling back to another logged-in account
      await supabase.auth.signOut();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: normalizedPhone,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Check if user already exists (Supabase returns empty identities for existing users if email enumeration protection is ON)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("An account with this email already exists.");
      }

      // We do NOT manually insert into 'profiles' here because:
      // 1. The frontend lacks INSERT permissions (RLS/Grants block it, returning 401/403).
      // 2. The database already has a trigger 'on_auth_user_created' that securely creates the profile.

      if (data.session) {
        // If an active session is immediately returned, redirect to dashboard
        router.push("/dashboard");
      } else if (data.user) {
        // If user is created but no session, it means email confirmation is required
        setError("Registration successful! Check your inbox. We've sent you a confirmation email.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-black relative overflow-hidden">
      
      {/* LEFT PANEL - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        
        {/* Mobile background elements */}
        <div className="lg:hidden absolute top-0 right-0 w-full h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10 -translate-y-1/2" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(23,163,74,0.15)]">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">CAPITAL GAIN HUB</span>
            </Link>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-black tracking-tighter mb-2">Create Account</h2>
            <p className="text-muted-foreground">Join Capital Gain Hub to start your trading journey.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={cn(
                  "border p-4 rounded-xl flex items-start gap-3",
                  error.includes("successful") 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                )}
              >
                {error.includes("successful") ? (
                  <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Full Name</Label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="name" 
                  type="text" 
                  required
                  placeholder="John Doe" 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  required
                  placeholder="name@example.com" 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Phone Number</Label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="phone" 
                  type="tel" 
                  required
                  placeholder="+1234567890" 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="password" 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Confirm Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  id="confirm-password" 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-base transition-all" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-start space-x-3 pt-2">
              <input type="checkbox" id="terms" required className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary focus:ring-offset-black h-4 w-4 mt-0.5" />
              <Label htmlFor="terms" className="text-xs font-medium text-muted-foreground cursor-pointer leading-relaxed">
                I agree to the <Link href="#" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</Link> and <Link href="#" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
              </Label>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-base font-bold bg-white text-black hover:bg-gray-200 transition-all group overflow-hidden relative">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? "Creating Account..." : (
                  <span className="flex items-center justify-center gap-2">
                    Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-center gap-4 before:h-px before:flex-1 before:bg-white/10 after:h-px after:flex-1 after:bg-white/10">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Or</span>
          </div>

          <div className="mt-8">
            <Button variant="outline" className="w-full h-14 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-base font-bold transition-colors">
              <svg viewBox="0 0 24 24" className="mr-3 h-5 w-5" aria-hidden="true">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
              </svg>
              Sign up with Google
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground font-medium">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-l border-white/5 flex-col justify-between p-12 z-10 bg-black/40 backdrop-blur-3xl">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay z-0" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10 -translate-x-1/2 translate-y-1/4" />
        
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] bg-[size:64px_64px] z-0" />
        
        <div className="relative z-10 flex justify-end">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span className="text-2xl font-black tracking-tighter text-white">CAPITAL GAIN HUB</span>
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(23,163,74,0.15)] group-hover:scale-105 transition-transform duration-300">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg ml-auto text-right">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl font-black tracking-tighter leading-tight mb-6">
              Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Trading Elite</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed">
              Create your account to unlock premium educational resources and start building your financial future.
            </p>
          </motion.div>
          
          <div className="mt-12 flex items-center justify-end gap-4 text-sm font-bold tracking-wider uppercase text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Verified Curriculum
            </div>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Professional Traders
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
