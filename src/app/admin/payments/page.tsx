"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Receipt, Calendar, CreditCard, User as UserIcon, BookOpen, Clock, Activity, CheckCircle, XCircle, ArrowRightLeft, ShieldCheck, Database, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Localized types that correctly map to the PostgreSQL schema
interface DBPayment {
  id: string;
  order_id: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';
  payment_method: string | null;
  created_at: string;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
}

interface DBOrder {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  gateway_order_id: string | null;
  user?: { full_name: string; avatar_url: string; email?: string };
  course?: { title: string; thumbnail_url: string };
  payments?: DBPayment[];
}

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from("orders")
        .select(`
          *,
          user:profiles ( full_name, avatar_url ),
          course:courses ( title, thumbnail_url ),
          payments (*)
        `)
        .order("created_at", { ascending: false });

      if (fetchErr) {
        throw new Error("Failed to decrypt financial ledgers: " + fetchErr.message);
      }

      setOrders(data as unknown as DBOrder[]);
    } catch (err: any) {
      setError(err.message || "Critical system failure during ledger retrieval.");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const lowerQ = searchQuery.toLowerCase();
    return orders.filter(
      (o) => 
        o.id.toLowerCase().includes(lowerQ) || 
        o.user?.full_name?.toLowerCase().includes(lowerQ) || 
        o.course?.title?.toLowerCase().includes(lowerQ)
    );
  }, [orders, searchQuery]);

  const openOrderDetails = (order: DBOrder) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[9px] uppercase tracking-widest font-black">Authorized</Badge>;
      case 'PENDING': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px] uppercase tracking-widest font-black">Processing</Badge>;
      case 'CANCELLED': return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/30 text-[9px] uppercase tracking-widest font-black">Terminated</Badge>;
      default: return <Badge variant="outline" className="bg-white/5 text-muted-foreground border-white/10 text-[9px] uppercase tracking-widest font-black">{status}</Badge>;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'REFUNDED': return <ArrowRightLeft className="w-4 h-4 text-cyan-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Decrypting Financial Ledgers...</p>
      </div>
    );
  }

  // Calculate some basic stats
  const totalRevenue = orders.filter(o => o.status === 'COMPLETED').reduce((sum, order) => sum + order.amount, 0);
  const totalOrders = orders.length;
  const successRate = totalOrders > 0 ? Math.round((orders.filter(o => o.status === 'COMPLETED').length / totalOrders) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none -z-0 -translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Financial Telemetry</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Payments <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Ledger</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Monitor transactional data and revenue streams.</p>
          </div>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 mb-8 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
            <Activity className="w-5 h-5 text-emerald-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{formatCurrency(totalRevenue)}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Authorized Capital</div>
          </div>
          
          <div className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-transparent" />
            <Receipt className="w-5 h-5 text-cyan-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{totalOrders}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Transactions Logged</div>
          </div>
          
          <div className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{successRate}%</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Authorization Success Rate</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden mb-8 p-6 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Query by Ledger ID, Operative, or Program..." 
              className="pl-12 bg-black/50 border-white/10 h-14 rounded-xl text-white focus:border-emerald-500 transition-colors placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                 <Database className="w-4 h-4 text-emerald-500" />
               </div>
               <h2 className="text-xl font-bold tracking-tight">Ledger Entries</h2>
             </div>
             <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
               {filteredOrders.length} Records
             </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black/60">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 pl-6">Ledger ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Timestamp</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Operative</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Target Program</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Capital</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Authorization</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 pr-6">Txn Nodes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Receipt className="w-12 h-12 text-white/10" />
                        <div>No ledger records matching the specified query.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const successPayments = order.payments?.filter(p => p.status === 'SUCCESS').length || 0;
                    const totalPayments = order.payments?.length || 0;
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        className="border-white/5 hover:bg-emerald-500/5 transition-colors cursor-pointer group"
                        onClick={() => openOrderDetails(order)}
                      >
                        <TableCell className="pl-6">
                          <div className="font-mono text-xs font-bold text-muted-foreground group-hover:text-emerald-500 transition-colors">
                            {order.id.substring(0, 8).toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono group-hover:text-white transition-colors whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 bg-black border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                              <AvatarImage src={order.user?.avatar_url || ""} />
                              <AvatarFallback className="bg-transparent text-emerald-500 font-bold font-mono text-xs">
                                {order.user?.full_name?.charAt(0).toUpperCase() || <UserIcon className="w-3 h-3" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                                {order.user?.full_name || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-white line-clamp-1 max-w-[200px]" title={order.course?.title}>
                            {order.course?.title || "Unknown Program"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {formatCurrency(order.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getOrderStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          {totalPayments > 0 ? (
                            <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                              {successPayments > 0 ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                              <span className="text-xs font-mono font-bold text-white">{successPayments}/{totalPayments}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">NULL</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full glass-card border-l border-white/10 bg-black/95 backdrop-blur-2xl overflow-y-auto p-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
          
          {selectedOrder && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="p-8 pb-6 border-b border-white/5 bg-white/[0.01]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Order Details</SheetTitle>
                  <SheetDescription>Detailed view of the order and its related payment attempts.</SheetDescription>
                </SheetHeader>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-emerald-500" />
                    </div>
                    {getOrderStatusBadge(selectedOrder.status)}
                  </div>
                  
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                      Ledger ID: <span className="font-mono">{selectedOrder.id}</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tighter text-white leading-none mb-3">
                      Transaction Record
                    </h2>
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-sm border border-white/10">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1 bg-black/40">
                {/* Gateway Info */}
                {selectedOrder.gateway_order_id && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                        <Activity className="w-4 h-4" /> Gateway Signature
                     </div>
                     <span className="font-mono text-xs text-white bg-black/50 px-2 py-1 rounded border border-white/10">{selectedOrder.gateway_order_id}</span>
                  </div>
                )}

                {/* Course Info */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Target Program
                  </h3>
                  <div className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/5 rounded-2xl p-4 flex items-center gap-4 group">
                    <div className="w-16 h-16 rounded-xl bg-black border border-white/10 overflow-hidden flex-shrink-0 relative">
                      {selectedOrder.course?.thumbnail_url ? (
                        <img src={selectedOrder.course.thumbnail_url} alt="Course" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 opacity-30 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {selectedOrder.course?.title || "Unknown Program"}
                      </h4>
                    </div>
                    <div className="font-black text-xl text-emerald-500 tracking-tighter">
                      {formatCurrency(selectedOrder.amount)}
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <UserIcon className="w-3 h-3" /> Originating Operative
                  </h3>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-4 group">
                    <Avatar className="h-12 w-12 bg-black border border-white/10">
                      <AvatarImage src={selectedOrder.user?.avatar_url || ""} />
                      <AvatarFallback className="text-emerald-500 font-bold font-mono">
                        {selectedOrder.user?.full_name?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white group-hover:text-emerald-400 transition-colors text-sm truncate">{selectedOrder.user?.full_name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">{selectedOrder.user?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Attempts */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2"><CreditCard className="w-3 h-3" /> Transaction History</span>
                    <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {selectedOrder.payments?.length || 0} Nodes
                    </span>
                  </h3>
                  
                  {(!selectedOrder.payments || selectedOrder.payments.length === 0) ? (
                    <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-2xl p-8 text-center text-sm text-muted-foreground">
                      Zero transaction nodes recorded in the ledger.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedOrder.payments
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((payment) => (
                          <div key={payment.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                            <div className={cn(
                              "absolute top-0 left-0 w-1 h-full",
                              payment.status === 'SUCCESS' ? "bg-emerald-500" :
                              payment.status === 'FAILED' ? "bg-red-500" :
                              payment.status === 'PENDING' ? "bg-amber-500" : "bg-cyan-500"
                            )} />
                            
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-white/5 border border-white/10">
                                  {getPaymentStatusIcon(payment.status)}
                                </div>
                                <span className={cn(
                                  "text-sm font-black uppercase tracking-widest",
                                  payment.status === 'SUCCESS' ? "text-emerald-500" :
                                  payment.status === 'FAILED' ? "text-red-500" :
                                  payment.status === 'PENDING' ? "text-amber-500" : "text-cyan-500"
                                )}>{payment.status}</span>
                              </div>
                              <span className="font-bold text-white tracking-tight">{formatCurrency(payment.amount)}</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t border-white/5 pt-3">
                                <span className="flex items-center gap-1.5">
                                  <CreditCard className="w-3 h-3" />
                                  {payment.payment_method || "Unknown Protocol"}
                                </span>
                                <span>{new Date(payment.created_at).toLocaleString()}</span>
                              </div>
                              <div className="bg-black/50 p-2 rounded-lg border border-white/5">
                                <div className="text-[9px] text-muted-foreground font-mono flex items-center justify-between">
                                  <span>TXN_ID</span>
                                  <span className="text-white truncate max-w-[200px]">{payment.id}</span>
                                </div>
                                {payment.gateway_payment_id && (
                                  <div className="text-[9px] text-muted-foreground font-mono flex items-center justify-between mt-1">
                                    <span>GW_ID</span>
                                    <span className="text-white truncate max-w-[200px]">{payment.gateway_payment_id}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
