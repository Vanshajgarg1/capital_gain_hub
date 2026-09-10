"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, Loader2, MessageSquare, Clock, CheckCircle2, ShieldCheck, Send, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createSupportTicket, getMySupportTickets } from "@/lib/api/support";
import { SupportTicket } from "@/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentSupportPage() {
  const { user, profile } = useAuth();
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getMySupportTickets();
        setTickets(data);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setIsLoadingTickets(false);
      }
    }
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!subject.trim() || !message.trim()) {
      setErrorMsg("Required parameters missing.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newTicket = await createSupportTicket(subject, message);
      setTickets([newTicket, ...tickets]);
      setSubject("");
      setMessage("");
      setSuccessMsg("Support ticket transmitted successfully. System monitoring initiated.");
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to establish uplink.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-amber-500 animate-spin-slow" />;
      case 'ANSWERED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'CLOSED': return <ShieldCheck className="w-4 h-4 text-slate-400" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return "text-blue-500 border-blue-500/20 bg-blue-500/10";
      case 'IN_PROGRESS': return "text-amber-500 border-amber-500/20 bg-amber-500/10";
      case 'ANSWERED': return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
      case 'CLOSED': return "text-slate-400 border-slate-500/20 bg-slate-500/10";
      default: return "text-white border-white/20 bg-white/10";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none -z-0 -translate-x-1/2 translate-y-1/4" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Comms Link Active</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Support</span></h1>
          <p className="text-xl text-muted-foreground font-medium">Establish a secure uplink with Capital Gain Hub command personnel.</p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Support Form */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 h-fit"
          >
            <Card className="glass-card rounded-[2rem] border border-white/5 bg-black/40 overflow-hidden relative shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent" />
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <LifeBuoy className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl tracking-tighter">Transmit Request</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Secure Channel Protocol</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operative Designation</label>
                    <Input 
                      value={profile?.full_name || ""} 
                      disabled 
                      className="bg-white/[0.02] border-white/5 h-12 rounded-xl text-white opacity-50" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authentication Signal</label>
                    <Input 
                      value={user?.email || ""} 
                      disabled 
                      className="bg-white/[0.02] border-white/5 h-12 rounded-xl text-white opacity-50" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transmission Subject</label>
                    <Input 
                      placeholder="Enter subject vector..." 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Encrypted Payload</label>
                    <Textarea 
                      placeholder="Detail your request parameters here..." 
                      className="min-h-[160px] bg-white/5 border-white/10 rounded-xl resize-none focus:border-blue-500 transition-colors p-4"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-14 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all group overflow-hidden relative mt-2" 
                    disabled={isSubmitting}
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <span className="flex items-center gap-2 relative z-10">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Transmitting...
                        </>
                      ) : (
                        <>
                          Initiate Uplink <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>

          {/* Ticket History */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-2xl font-black tracking-tighter">Transmission Logs</h2>
            </div>
            
            {isLoadingTickets ? (
              <div className="flex items-center justify-center p-20 glass-card rounded-[2rem] border border-white/5 bg-black/40">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <Card className="glass-card rounded-[2rem] border border-white/5 bg-black/40 relative overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <MessageSquare className="w-8 h-8 opacity-50" />
                  </div>
                  <h3 className="font-bold text-xl text-white mb-2">No Active Transmissions</h3>
                  <p className="text-sm">Your communication logs are currently empty.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket, idx) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + (idx * 0.05) }}
                  >
                    <Link href={`/dashboard/support/${ticket.id}`} className="block">
                      <Card className="glass-card rounded-2xl border border-white/5 bg-black/40 hover:bg-white/[0.05] transition-all overflow-hidden group cursor-pointer hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <div className="p-6 flex flex-col gap-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                getStatusColor(ticket.status).replace('text-', 'bg-').replace('10', '10 border-opacity-20')
                              )}>
                                {getStatusIcon(ticket.status)}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors text-white">{ticket.subject}</h4>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <span>{formatDate(ticket.created_at)}</span>
                                  <span className="w-1 h-1 rounded-full bg-white/20" />
                                  <span className="font-mono text-[9px]">ID: {ticket.id.substring(0, 8)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shrink-0",
                                getStatusColor(ticket.status)
                              )}>
                                {ticket.status}
                              </div>
                              <span className="text-muted-foreground group-hover:text-white transition-colors">
                                <Send className="w-4 h-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
