"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ShieldCheck, ArrowRight, Download, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface Certificate {
  id: string;
  course_id: string;
  course_title: string;
  certificate_number: string;
  download_url: string | null;
  issued_at: string;
}

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCertificates() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/certificates", {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (!res.ok) {
          throw new Error("Failed to load credentials");
        }

        const data = await res.json();
        setCertificates(data.certificates || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCertificates();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-black">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary rounded-full blur-[30px] opacity-20 animate-pulse" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10 mx-auto" />
          </div>
          <h2 className="text-xl font-black tracking-widest uppercase text-white/50">Fetching Credentials...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(23,163,74,0.8)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Achievement Vault</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">My <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Certificates</span></h1>
          <p className="text-xl text-muted-foreground font-medium">Your certificates of course completion.</p>
        </motion.div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mb-6">
            Error loading credentials: {error}
          </div>
        )}

        {certificates.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center py-32 glass-card rounded-[2rem] border border-white/5 bg-black/40 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[80px] -z-10" />
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Award className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter mb-4 text-white">No Certificates Yet</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto font-medium">
              Complete your enrolled courses to receive your certificate of completion.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard/path">
                <Button size="lg" className="h-14 px-8 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(23,163,74,0.3)] transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span className="flex items-center gap-2 relative z-10">
                    Return to Mission <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
            </div>
            
            <div className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/50 bg-white/5 border border-white/10 px-6 py-3 rounded-xl mt-12">
              <ShieldCheck className="w-4 h-4" />
              <span>Certificates are issued after completing 100% of the required course lessons.</span>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (index * 0.1) }}
              >
                <Card className="glass-card overflow-hidden bg-black/40 border-white/10 group hover:border-primary/50 transition-colors">
                  <CardContent className="p-0">
                    <div 
                      className="aspect-[1.4] relative flex items-center justify-center p-6 border-b border-white/10 overflow-hidden bg-cover bg-center group-hover:border-primary/30 transition-colors"
                      style={{ backgroundImage: 'url("/images/certificate-card-bg.jpg")' }}
                    >
                      {/* Primary dark gradient overlay for cinematic feel */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/15 to-black/35 pointer-events-none" />
                      {/* Secondary subtle radial overlay for text readability in the center */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/20 to-transparent pointer-events-none" />

                      <div className="text-center relative z-10 space-y-4 w-full">
                        <Award className="w-12 h-12 text-primary mx-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] opacity-90" />
                        <div className="space-y-1">
                          <h3 className="font-bold text-xl text-white px-4 drop-shadow-lg leading-tight">{cert.course_title}</h3>
                          <p className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-widest drop-shadow-md">Certificate of Completion</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> Issued On
                          </span>
                          <p className="font-medium text-white">
                            {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 justify-end">
                            <ShieldCheck className="w-3 h-3" /> Credential ID
                          </span>
                          <p className="font-mono text-sm text-white/80">{cert.certificate_number}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4">
                        {cert.download_url ? (
                          <>
                            <a 
                              href={cert.download_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex-1"
                            >
                              <Button variant="outline" className="w-full h-12 border-white/20 text-white hover:bg-white/10 hover:text-white font-bold rounded-xl gap-2">
                                <Award className="w-4 h-4" /> View Certificate
                              </Button>
                            </a>
                            <a 
                              href={cert.download_url} 
                              download
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex-1"
                            >
                              <Button className="w-full h-12 bg-white text-black hover:bg-gray-200 font-bold rounded-xl gap-2">
                                <Download className="w-4 h-4" /> Download PDF
                              </Button>
                            </a>
                          </>
                        ) : (
                          <Button onClick={() => window.location.reload()} className="w-full h-12 bg-white/10 text-white/80 hover:bg-white/20 font-bold rounded-xl gap-2">
                            Certificate temporarily unavailable - Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
