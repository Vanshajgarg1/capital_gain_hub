"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Send, ShieldCheck, User, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { getSupportTicketDetails, replyToTicket, updateTicketStatus } from "@/lib/api/support";
import { SupportTicket, SupportMessage } from "@/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [isPromoted, setIsPromoted] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ question: "", answer: "", category: "Support" });

  useEffect(() => {
    async function loadTicket() {
      try {
        const data = await getSupportTicketDetails(ticketId);
        setTicket(data.ticket);
        setMessages(data.messages);

        const studentMessages = data.messages.filter((m: any) => m.profiles?.role !== "ADMIN");
        const firstStudentMessage = studentMessages.length > 0 ? studentMessages[0].message : data.ticket.subject;
        const normalizedQuestion = firstStudentMessage.trim().replace(/\s+/g, ' ');

        const { data: existingFaq } = await supabase
          .from("faqs")
          .select("id")
          .ilike("question", normalizedQuestion)
          .limit(1);

        if (existingFaq && existingFaq.length > 0) {
          setIsPromoted(true);
        }
      } catch (err) {
        console.error("Failed to load ticket details", err);
        toast.error("Failed to load ticket.");
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
    try {
      const newMessage = await replyToTicket(ticketId, replyText);
      setMessages([...messages, { ...newMessage, profiles: { role: "ADMIN" } } as any]);
      setReplyText("");
      
      // Auto-update status to ANSWERED if it was OPEN or IN_PROGRESS
      if (ticket?.status === 'OPEN' || ticket?.status === 'IN_PROGRESS') {
        handleStatusChange('ANSWERED');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateTicketStatus(ticket.id, newStatus);
      setTicket(updated);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenPromoteDialog = () => {
    const studentMessages = messages.filter((m: any) => m.profiles?.role !== "ADMIN");
    const firstStudentMessage = studentMessages.length > 0 ? studentMessages[0].message : ticket?.subject || "";
    
    const adminReplies = messages.filter((m: any) => m.profiles?.role === "ADMIN");
    const latestAdminReply = adminReplies.length > 0 ? adminReplies[adminReplies.length - 1].message : "";
    
    setPromoteForm({
      question: firstStudentMessage,
      answer: latestAdminReply,
      category: "Support"
    });
    
    setIsPromoteDialogOpen(true);
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/admin/faq/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(promoteForm)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to add to Knowledge Base");
      }
      
      toast.success("Added to Knowledge Base");
      setIsPromoted(true);
      setIsPromoteDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPromoteLoading(false);
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
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(new Date(dateString));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center p-20 glass-card rounded-2xl border-white/5 bg-black/40">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Ticket Not Found</h2>
        <Button onClick={() => router.push("/admin/support")} className="mt-4">Back to Support</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href="/admin/support" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm font-bold uppercase tracking-wider mb-2">
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </Link>
      
      {/* Ticket Header & Controls */}
      <div className="glass-card rounded-3xl border border-white/5 bg-black/40 p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>{formatDate(ticket.created_at)}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="font-mono text-white/50">ID: {ticket.id}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-4">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm bg-white/5 w-fit px-4 py-2 rounded-xl mt-4">
              <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-white">{(ticket as any).profiles?.full_name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                <span className="font-mono text-muted-foreground">{(ticket as any).profiles?.email || "No email"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white/80">Student ID:</span> 
                <span className="font-mono text-muted-foreground">{ticket.user_id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start lg:items-end gap-4 min-w-[200px]">
            <div className={cn(
              "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full border shrink-0",
              getStatusColor(ticket.status)
            )}>
              {ticket.status}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end">
              {messages.filter((m: any) => m.profiles?.role === "ADMIN").length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "border",
                    isPromoted 
                      ? "border-emerald-500/20 text-emerald-500/50 bg-emerald-500/5" 
                      : "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  )}
                  onClick={handleOpenPromoteDialog}
                  disabled={isPromoted}
                >
                  {isPromoted ? "In Knowledge Base" : "Add to Knowledge Base"}
                </Button>
              )}
              {ticket.status !== 'ANSWERED' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  onClick={() => handleStatusChange('ANSWERED')}
                  disabled={isUpdatingStatus}
                >
                  Mark Answered
                </Button>
              )}
              {ticket.status !== 'CLOSED' ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={isUpdatingStatus}
                >
                  Close Ticket
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => handleStatusChange('OPEN')}
                  disabled={isUpdatingStatus}
                >
                  Reopen
                </Button>
              )}
            </div>
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
                isAdmin ? "justify-end" : "justify-start"
              )}
            >
              {!isAdmin && (
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-5 h-5 text-white/50" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[85%] md:max-w-[75%] rounded-2xl p-5 border",
                isAdmin 
                  ? "bg-blue-500/5 border-blue-500/20 rounded-tr-sm" 
                  : "bg-white/5 border-white/10 rounded-tl-sm"
              )}>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isAdmin ? "text-blue-400" : "text-muted-foreground")}>
                    {isAdmin ? "You (Admin)" : "Student"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">{formatDate(msg.created_at)}</span>
                </div>
                <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {msg.message}
                </div>
              </div>

              {isAdmin && (
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Reply Box */}
      <Card className="glass-card rounded-[2rem] border border-white/5 bg-black/40 overflow-hidden p-6">
        <form onSubmit={handleReply} className="flex flex-col gap-4">
          <Textarea 
            placeholder="Write your admin reply..." 
            className="min-h-[120px] bg-white/[0.02] border-white/10 rounded-xl resize-none focus:border-blue-500 transition-colors p-4"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={isReplying}
            required
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground italic">Replying as Admin. This will be visible to the student.</p>
            <Button 
              type="submit" 
              className="h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all" 
              disabled={isReplying || !replyText.trim()}
            >
              {isReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reply"}
            </Button>
          </div>
        </form>
      </Card>

      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-black/95 backdrop-blur-3xl border-white/10 shadow-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-cyan-400" />
          <DialogHeader className="p-6 md:p-8 bg-white/5 border-b border-white/5">
            <DialogTitle className="text-2xl font-bold tracking-tight">Add to Knowledge Base</DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Promote this support thread to the global FAQ system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePromoteSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Question</Label>
              <Textarea 
                value={promoteForm.question} 
                onChange={e => setPromoteForm({...promoteForm, question: e.target.value})} 
                placeholder="The original question..."
                className="bg-black/50 border-white/10 min-h-[80px] text-base focus-visible:ring-primary"
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Answer</Label>
              <Textarea 
                value={promoteForm.answer} 
                onChange={e => setPromoteForm({...promoteForm, answer: e.target.value})} 
                placeholder="The admin reply..."
                className="min-h-[120px] bg-black/50 border-white/10 text-base focus-visible:ring-primary resize-y"
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Category (Optional)</Label>
              <Input 
                value={promoteForm.category} 
                onChange={e => setPromoteForm({...promoteForm, category: e.target.value})} 
                placeholder="e.g. Support"
                className="bg-black/50 border-white/10 h-12 text-base focus-visible:ring-primary"
              />
            </div>
            <DialogFooter className="mt-8 pt-4 gap-3 border-t border-white/5">
              <Button type="button" variant="outline" onClick={() => setIsPromoteDialogOpen(false)} disabled={promoteLoading} className="h-12 px-6 rounded-xl border-white/10 hover:bg-white/5 text-base">
                Cancel
              </Button>
              <Button type="submit" disabled={promoteLoading} className="h-12 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all text-base">
                {promoteLoading ? "Adding..." : "Add to Knowledge Base"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
