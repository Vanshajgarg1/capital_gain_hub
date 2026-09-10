"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, BookOpen, CreditCard, User as UserIcon, Activity, ArrowUpRight, TrendingUp, Cpu, ShieldAlert, Clock, Lock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Native SVG Area Chart Component
const HistoricalChart = ({ data }: { data: { date: string; revenue: number }[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground z-10 relative">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-bold text-lg text-white mb-1">No financial activity yet</p>
        <p className="text-xs font-bold uppercase tracking-widest">Network is silent</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1000); // Ensure some height even if all 0
  const width = 800;
  const height = 250;
  
  const getX = (index: number) => (index / (data.length - 1)) * width;
  const getY = (value: number) => height - (value / maxRevenue) * height;

  const points = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(" ");
  const areaPath = `M0,${height} L${points} L${width},${height} Z`;

  return (
    <div className="w-full h-full p-4 md:p-8 flex items-end justify-center relative z-10" style={{ minHeight: '350px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1="0" y1="0" x2={width} y2="0" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
        <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
        <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.1)" />

        {/* Fill Area */}
        <path d={areaPath} fill="url(#areaGradient)" />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
        />

        {/* Data Points on top of the line */}
        {data.map((d, i) => (
          d.revenue > 0 && (
            <circle 
              key={i} 
              cx={getX(i)} 
              cy={getY(d.revenue)} 
              r="4" 
              fill="black" 
              stroke="rgb(239, 68, 68)" 
              strokeWidth="2" 
              className="hover:r-6 hover:fill-red-500 transition-all cursor-crosshair group" 
            >
              <title>{`${d.date}: ₹${d.revenue}`}</title>
            </circle>
          )
        ))}
      </svg>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({ students: 0, courses: 0, enrollments: 0, revenue: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{date: string, revenue: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchingRef = useRef(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Unauthorized: Please log in.");
      }

      const response = await fetch("/api/admin/telemetry", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch telemetry data.");
      }

      const data = await response.json();

      setMetrics(data.metrics);
      setRecentSales(data.recentSales);
      setChartData(data.chartData);

    } catch (err: any) {
      console.error("Admin overview fetch error:", err);
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Root Access</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Center</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Platform telemetry and network analytics.</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="h-12 px-6 rounded-xl bg-transparent border-white/10 text-white hover:bg-white/5 font-bold">
              <Database className="w-4 h-4 mr-2" /> Export Logs
            </Button>
            <Button 
              onClick={() => fetchMetrics()} 
              disabled={loading}
              className="h-12 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all"
            >
              <Activity className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> 
              {loading ? "Scanning..." : "Refresh Telemetry"}
            </Button>
          </div>
        </motion.div>

        {error ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="p-6 border border-red-500/20 rounded-2xl bg-red-500/10 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-red-500">Unable to load financial telemetry.</h3>
                  <p className="text-sm font-medium text-red-400">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => fetchMetrics()} className="border-red-500/30 text-red-500 hover:bg-red-500/20 font-bold">
                Retry Connection
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Network Revenue", value: formatCurrency(metrics.revenue), icon: DollarSign, trend: "Cleared capital", color: "emerald", data: metrics.revenue },
                { title: "Active Operatives", value: metrics.students.toLocaleString(), icon: Users, trend: "Registered accounts", color: "blue", data: metrics.students },
                { title: "Deployed Programs", value: metrics.courses.toLocaleString(), icon: BookOpen, trend: "Live curriculums", color: "purple", data: metrics.courses },
                { title: "Total Clearances", value: metrics.enrollments.toLocaleString(), icon: CreditCard, trend: "Active enrollments", color: "amber", data: metrics.enrollments },
              ].map((metric, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (idx * 0.1) }}
                >
                  <Card className="glass-card rounded-[1.5rem] border border-white/5 bg-black/40 hover:bg-white/[0.02] hover:border-white/10 transition-all group overflow-hidden relative">
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/[0.02] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Lock className="w-5 h-5 text-white/20" /></div>
                    <div className={cn(
                      "absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -z-10 opacity-20 group-hover:opacity-40 transition-opacity",
                      metric.color === "emerald" ? "bg-emerald-500" :
                      metric.color === "blue" ? "bg-blue-500" :
                      metric.color === "purple" ? "bg-purple-500" : "bg-amber-500"
                    )} />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5 mb-4 px-6 pt-6">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">{metric.title}</CardTitle>
                      <metric.icon className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                      {loading ? (
                        <div className="h-10 w-24 bg-white/10 animate-pulse rounded-lg" />
                      ) : (
                        <>
                          <div className="text-3xl font-black tracking-tighter text-white mb-2">{metric.value}</div>
                          <div className="flex items-center gap-1.5">
                            {metric.color === "emerald" ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Cpu className="w-3 h-3 text-muted-foreground/50" />
                            )}
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              metric.color === "emerald" ? "text-emerald-500" : "text-muted-foreground/70"
                            )}>
                              {metric.trend}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-8 pt-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-4"
              >
                <Card className="glass-card rounded-[1.5rem] border border-white/5 bg-black/40 h-full flex flex-col">
                  <CardHeader className="border-b border-white/5 px-8 py-6">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                      <span className="font-black tracking-tighter text-2xl">Financial Telemetry (30 Days)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[350px] flex items-center justify-center relative overflow-hidden p-0">
                    <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay z-0 pointer-events-none" />
                    
                    {loading ? (
                      <div className="flex flex-col items-center text-center z-10 p-8">
                        <div className="w-12 h-12 mb-4 rounded-full border-t-2 border-red-500 animate-spin" />
                        <p className="font-bold text-lg text-white mb-1">Loading Data Streams</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Historical charts are initializing...</p>
                      </div>
                    ) : (
                      <HistoricalChart data={chartData} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-3"
              >
                <Card className="glass-card rounded-[1.5rem] border border-white/5 bg-black/40 h-full">
                  <CardHeader className="border-b border-white/5 px-8 py-6 flex flex-row items-center justify-between">
                    <CardTitle className="font-black tracking-tighter text-2xl">Recent Influx</CardTitle>
                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-500/20 bg-red-500/10 text-red-500 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                    </span>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 space-y-6">
                        {[1,2,3,4,5].map((i) => (
                          <div key={i} className="flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-white/5" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/5 rounded-md" />
                                <div className="h-3 w-20 bg-white/5 rounded-md" />
                              </div>
                            </div>
                            <div className="h-6 w-20 bg-white/5 rounded-md" />
                          </div>
                        ))}
                      </div>
                    ) : recentSales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <DollarSign className="w-10 h-10 mb-4 opacity-20" />
                        <p className="font-bold text-white">No incoming capital</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Network is silent</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {recentSales.map((sale, i) => {
                          const profile = Array.isArray(sale.order?.user) ? sale.order.user[0] : sale.order?.user;
                          const fullName = profile?.full_name || "Unknown Operative";
                          const avatarUrl = profile?.avatar_url;
                          
                          return (
                            <div key={sale.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border border-white/10 bg-black group-hover:border-white/30 transition-colors">
                                  <AvatarImage src={avatarUrl || ""} />
                                  <AvatarFallback className="text-white text-sm font-bold bg-white/5">
                                    {fullName.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-bold text-white leading-tight mb-1 group-hover:text-red-400 transition-colors">{fullName}</p>
                                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {new Date(sale.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-lg text-emerald-500">
                                  +{formatCurrency(sale.amount)}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50 mt-1">
                                  Cleared
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
