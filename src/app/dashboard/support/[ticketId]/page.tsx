"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send, MessageSquare, Clock, CheckCircle2, ShieldCheck, User, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupportTicketDetails, replyToTicket } from "@/lib/api/support";
import { SupportTicket, SupportMessage } from "@/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadTicket() {
      try {
        const data = await getSupportTicketDetails(ticketId);
        setTicket(data.ticket);
        setMessages(data.messages);
      } catch (err) {
        console.error("Failed to load ticket details", err);
        setErrorMsg("Failed to establish secure connection to this transmission.");
      } finally {
        setIsLoading(false);
      }
    }
    if (ticketId) loadTicket();
  }, [ticketId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    setIsReplying(true);
    setErrorMsg("");
    try {
      const newMessage = await replyToTicket(ticketId, replyText);
      // Optimistically add the new message
      setMessages([...messages, { ...newMessage, profiles: { role: "STUDENT" } } as any]);
      setReplyText("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to transmit reply.");
    } finally {
      setIsReplying(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs font-bold">Decrypting Transmission...</p>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-white">Access Denied</h2>
          <p className="text-muted-foreground">{errorMsg || "Ticket not found or unauthorized."}</p>
          <Button onClick={() => router.push("/dashboard/support")} variant="outline" className="border-white/10 text-white hover:bg-white/5">
            Return to Command Support
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 relative z-10">
        <Link href="/dashboard/support" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm font-bold uppercase tracking-wider mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Transmissions
        </Link>
        
        {/* Ticket Header */}
        <div className="glass-card rounded-[2rem] border border-white/5 bg-black/40 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent" />
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>{formatDate(ticket.created_at)}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="font-mono text-blue-400">ID: {ticket.id}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{ticket.subject}</h1>
            </div>
            <div className={cn(
              "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full border shrink-0 w-fit",
              getStatusColor(ticket.status)
            )}>
              {ticket.status}
            </div>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="space-y-6">
          {messages.map((msg, idx) => {
            const isAdmin = (msg as any).profiles?.role === "ADMIN";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "flex gap-4 w-full",
                  isAdmin ? "justify-start" : "justify-end"
                )}
              >
                {isAdmin && (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[85%] md:max-w-[75%] rounded-2xl p-5 border",
                  isAdmin 
                    ? "bg-blue-500/5 border-blue-500/20 rounded-tl-sm" 
                    : "bg-white/5 border-white/10 rounded-tr-sm"
                )}>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isAdmin ? "text-blue-400" : "text-muted-foreground")}>
                      {isAdmin ? "Admin Support" : "You"}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">{formatDate(msg.created_at)}</span>
                  </div>
                  <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {msg.message}
                  </div>
                </div>

                {!isAdmin && (
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5 text-white/70" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Reply Box */}
        {ticket.status !== 'CLOSED' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <Card className="glass-card rounded-[2rem] border border-white/5 bg-black/40 overflow-hidden shadow-2xl p-6">
              <form onSubmit={handleReply} className="flex flex-col gap-4">
                <Textarea 
                  placeholder="Transmit reply..." 
                  className="min-h-[120px] bg-white/[0.02] border-white/10 rounded-xl resize-none focus:border-blue-500 transition-colors p-4"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isReplying}
                  required
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all group" 
                    disabled={isReplying || !replyText.trim()}
                  >
                    {isReplying ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Transmit Reply <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : (
          <div className="mt-10 text-center p-8 glass-card rounded-2xl border border-white/5 bg-white/[0.02]">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Transmission Closed</h3>
            <p className="text-sm text-muted-foreground">This support ticket has been marked as closed and cannot accept new replies.</p>
          </div>
        )}
      </div>
    </div>
  );
}
