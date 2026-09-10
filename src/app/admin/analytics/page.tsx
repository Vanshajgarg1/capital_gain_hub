"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, BookOpen, CreditCard, DollarSign, AlertCircle, BarChart3, Activity, ActivityIcon, Cpu, Zap, Signal, Globe, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MonthlyData {
  sortKey: string;
  label: string;
  revenue: number;
  enrollments: number;
}

interface CoursePerformance {
  id: string;
  title: string;
  enrollments: number;
  revenue: number;
}

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState({ revenue: 0, students: 0, enrollments: 0, courses: 0 });
  const [studentActivity, setStudentActivity] = useState({ totalProgress: 0, completedLessons: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformance[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchingRef = useRef(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);

      // Run independent aggregate queries concurrently
      const [
        { count: studentsCount, error: studentsErr },
        { count: coursesCount, error: coursesErr },
        { count: enrollmentsCount, error: enrollmentsCountErr },
        { data: paymentsData, error: paymentsErr },
        { data: enrollmentsData, error: enrollmentsDataErr },
        { count: progressCount, error: progressErr },
        { count: completedProgressCount, error: completedProgressErr },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true).eq("is_archived", false),
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase.from("payments").select(`
          amount, 
          created_at, 
          order:orders(course:courses(id, title))
        `).eq("status", "SUCCESS"),
        supabase.from("enrollments").select(`
          enrolled_at, 
          course:courses(id, title)
        `),
        supabase.from("lesson_progress").select("*", { count: "exact", head: true }),
        supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("is_completed", true),
      ]);

      if (studentsErr) throw studentsErr;
      if (coursesErr) throw coursesErr;
      if (enrollmentsCountErr) throw enrollmentsCountErr;
      if (paymentsErr) throw paymentsErr;
      if (enrollmentsDataErr) throw enrollmentsDataErr;
      if (progressErr) throw progressErr;
      if (completedProgressErr) throw completedProgressErr;

      // Processing Revenue and Course Performance
      let totalRevenue = 0;
      const monthlyMap = new Map<string, MonthlyData>();
      const coursesMap = new Map<string, CoursePerformance>();

      // Process Enrollments
      enrollmentsData?.forEach(e => {
        const c = Array.isArray(e.course) ? e.course[0] : e.course;
        if (c?.id) {
          if (!coursesMap.has(c.id)) {
            coursesMap.set(c.id, { id: c.id, title: c.title, enrollments: 0, revenue: 0 });
          }
          coursesMap.get(c.id)!.enrollments += 1;
        }

        const d = new Date(e.enrolled_at);
        if (!isNaN(d.getTime())) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { sortKey: monthKey, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), revenue: 0, enrollments: 0 });
          }
          monthlyMap.get(monthKey)!.enrollments += 1;
        }
      });

      // Process Payments
      paymentsData?.forEach(p => {
        const amt = Number(p.amount) || 0;
        totalRevenue += amt;

        const d = new Date(p.created_at);
        if (!isNaN(d.getTime())) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { sortKey: monthKey, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), revenue: 0, enrollments: 0 });
          }
          monthlyMap.get(monthKey)!.revenue += amt;
        }

        const o = Array.isArray(p.order) ? p.order[0] : p.order;
        const c = o ? (Array.isArray(o.course) ? o.course[0] : o.course) : null;
        if (c?.id) {
          if (!coursesMap.has(c.id)) {
            coursesMap.set(c.id, { id: c.id, title: c.title, enrollments: 0, revenue: 0 });
          }
          coursesMap.get(c.id)!.revenue += amt;
        }
      });

      const sortedMonthly = Array.from(monthlyMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      const finalMonthly = sortedMonthly.slice(-12);
      const sortedCourses = Array.from(coursesMap.values()).sort((a, b) => b.revenue - a.revenue);

      setMetrics({
        revenue: totalRevenue,
        students: studentsCount || 0,
        courses: coursesCount || 0,
        enrollments: enrollmentsCount || 0,
      });
      
      setStudentActivity({
        totalProgress: progressCount || 0,
        completedLessons: completedProgressCount || 0,
      });

      setMonthlyData(finalMonthly);
      setCoursePerformance(sortedCourses);

    } catch (err: any) {
      console.error("Admin analytics fetch error:", err);
      setError(err.message || "Failed to establish telemetry connection.");
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

  const maxRevenue = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.revenue)) : 0;
  const maxEnrollments = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.enrollments)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 animate-pulse">Establishing Telemetry Link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Global Command Telemetry</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Analytics <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-400">Hub</span></h1>
            <p className="text-xl text-muted-foreground font-medium">Real-time macro analysis of system vitals.</p>
          </div>
          <Button 
            className="h-12 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-2 relative z-10">
              <Download className="w-4 h-4" /> Export Telemetry Report
            </span>
          </Button>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center justify-between gap-3 mb-8 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => { fetchingRef.current = false; fetchAnalytics(); }} className="border-red-500/30 hover:bg-red-500/20 text-red-500 bg-transparent h-8 rounded-lg font-bold uppercase tracking-widest text-[9px]">
                Re-establish Link
              </Button>
            </div>
          </motion.div>
        )}

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-transparent" />
            <DollarSign className="w-5 h-5 text-emerald-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{formatCurrency(metrics.revenue)}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Global Revenue</div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-transparent" />
            <Users className="w-5 h-5 text-cyan-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{metrics.students.toLocaleString()}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Operatives</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-transparent" />
            <CreditCard className="w-5 h-5 text-purple-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{metrics.enrollments.toLocaleString()}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Authorizations</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card border border-white/5 bg-black/40 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-transparent" />
            <BookOpen className="w-5 h-5 text-amber-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl font-black text-white tracking-tighter mb-1">{metrics.courses.toLocaleString()}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Programs</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* REVENUE & ENROLLMENT CHART */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
            className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight leading-none mb-1">Growth Matrix</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Revenue (Emerald) vs Auth (Cyan)</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex items-end">
              {monthlyData.length === 0 ? (
                <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                  <Signal className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Insufficient Data Streams</p>
                </div>
              ) : (
                <div className="w-full h-[250px] flex items-end gap-2 sm:gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {monthlyData.map((d, i) => (
                    <motion.div 
                      key={d.sortKey} 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "100%" }}
                      transition={{ delay: 0.5 + (i * 0.05), duration: 0.8, ease: "easeOut" }}
                      className="flex flex-col items-center flex-1 gap-3 min-w-[40px] h-full"
                    >
                      <div className="w-full flex gap-1 justify-center items-end h-[220px] relative group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg -z-10" />
                        
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-2xl backdrop-blur-xl">
                          <div className="text-emerald-500 text-[10px] font-bold font-mono">₹{d.revenue.toLocaleString()}</div>
                          <div className="text-cyan-500 text-[10px] font-bold font-mono">{d.enrollments} Auths</div>
                        </div>

                        {maxRevenue > 0 && (
                          <div 
                            className="w-full max-w-[16px] bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                            style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 100)}%` }} 
                          />
                        )}
                        {maxEnrollments > 0 && (
                          <div 
                            className="w-full max-w-[16px] bg-cyan-500 hover:bg-cyan-400 transition-colors rounded-t-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]" 
                            style={{ height: `${Math.max(2, (d.enrollments / maxEnrollments) * 100)}%` }} 
                          />
                        )}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{d.label}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* STUDENT ACTIVITY */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }}
            className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent" />
            <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <ActivityIcon className="w-4 h-4 text-cyan-500" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Operative Activity</h2>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center gap-6">
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-3 h-3 text-cyan-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Activity Nodes</p>
                  </div>
                  <p className="text-4xl font-black text-white tracking-tighter">{studentActivity.totalProgress.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Cpu className="w-8 h-8" />
                </div>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-3 h-3 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completed Payloads</p>
                  </div>
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter">{studentActivity.completedLessons.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Zap className="w-8 h-8" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* COURSE PERFORMANCE */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.7 }}
          className="glass-card border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-transparent" />
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                 <BookOpen className="w-4 h-4 text-purple-500" />
               </div>
               <div>
                 <h2 className="text-lg font-bold tracking-tight leading-none mb-1">Program Efficiency</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Capital allocation per sector</p>
               </div>
             </div>
          </div>
          
          <div className="p-6">
            {coursePerformance.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mb-4 opacity-20 text-white" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No program data detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coursePerformance.map((course, index) => (
                  <motion.div 
                    key={course.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + (index * 0.1) }}
                    className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black border border-white/10 text-muted-foreground font-bold font-mono text-xs group-hover:text-purple-400 group-hover:border-purple-500/30 transition-colors">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                          {course.title || "Classified Program"}
                        </p>
                        <p className="text-[9px] font-mono text-muted-foreground mt-1">
                          ID: {course.id.split('-')[0]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 sm:gap-12">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Auths</span>
                        <span className="font-mono font-bold text-white">{course.enrollments.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col items-end min-w-[100px]">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Capital</span>
                        <span className="font-mono font-bold text-emerald-500">{formatCurrency(course.revenue)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
