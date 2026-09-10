"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Search, Filter, ShieldCheck, Mail, Calendar } from "lucide-react";
import { getAllSupportTickets } from "@/lib/api/support";
import { SupportTicket } from "@/types";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<(SupportTicket & { profiles: { full_name: string; email: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getAllSupportTickets();
        setTickets(data);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTickets();
  }, []);

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
      month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit"
    }).format(new Date(dateString));
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ticket.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Support Command Center</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to student inquiries.</p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="glass-card bg-black/40 border-white/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search subject, name, or email..." 
                className="pl-9 bg-white/5 border-white/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {["ALL", "OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"].map(status => (
                <Button 
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "border-white/10 shrink-0",
                    statusFilter === status && status !== "ALL" ? getStatusColor(status).replace('text-', 'bg-').replace('10', '20 text-white') : ""
                  )}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-20 glass-card rounded-2xl border border-white/5 bg-black/40">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card className="glass-card border-white/5 bg-black/40 text-center p-16">
          <MessageSquare className="w-12 h-12 opacity-20 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No Tickets Found</h3>
          <p className="text-muted-foreground">Adjust your filters to see more results.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/admin/support/${ticket.id}`} className="block">
                <Card className="glass-card border-white/5 bg-black/40 hover:bg-white/5 transition-all group overflow-hidden">
                  <div className="p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border",
                          getStatusColor(ticket.status)
                        )}>
                          {ticket.status}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">ID: {ticket.id.substring(0,8)}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors leading-tight">
                        {ticket.subject}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="font-medium text-white/80">{ticket.profiles?.full_name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {ticket.profiles?.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Updated: {formatDate(ticket.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
