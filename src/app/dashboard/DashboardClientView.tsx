"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlayCircle, Clock, BookOpen, Trophy, Loader2, ArrowRight, TrendingUp, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getMyEnrollments, getCourseProgress, getPublishedCourses } from "@/lib/api/courses";
import { Enrollment, Course } from "@/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EnrollmentWithProgress extends Enrollment {
  calculated_progress: number;
}

export default function DashboardClientView() {
  const { user, profile, isLoading: authLoading } = useAuth();
  
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [recommended, setRecommended] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;
      
      try {
        const myEnrollments = await getMyEnrollments();
        
        // Calculate progress for each enrollment
        const enrollmentsWithProgress = await Promise.all(
          myEnrollments.map(async (enr) => {
            const progress = await getCourseProgress(enr.course_id);
            return {
              ...enr,
              calculated_progress: progress
            };
          })
        );
        
        setEnrollments(enrollmentsWithProgress);
        
        // Fetch recommendations (courses not enrolled in)
        const allPublished = await getPublishedCourses() || [];
        const enrolledIds = new Set(myEnrollments.map(e => e.course_id));
        const notEnrolled = allPublished.filter(c => !enrolledIds.has(c.id));
        setRecommended(notEnrolled.slice(0, 3));
        
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadDashboard();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-black">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary rounded-full blur-[30px] opacity-20 animate-pulse" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10 mx-auto" />
          </div>
          <h2 className="text-2xl font-black tracking-widest uppercase text-white/50">Initializing Terminal...</h2>
        </div>
      </div>
    );
  }

  const activeEnrollment = enrollments[0]; // Just showing the most recent as "active" for now

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none -z-0 -translate-x-1/2 translate-y-1/4" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto relative z-10 space-y-12">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">System Online</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">{profile?.full_name?.split(' ')[0] || "Trader"}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Active Courses</div>
              <div className="text-2xl font-black text-white">{enrollments.length}</div>
            </div>
            <div className="w-px h-10 bg-white/10 mx-2" />
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Completion</div>
              <div className="text-2xl font-black text-primary">
                {enrollments.length > 0 
                  ? Math.round(enrollments.reduce((acc, curr) => acc + curr.calculated_progress, 0) / enrollments.length) 
                  : 0}%
              </div>
            </div>
          </div>
        </motion.div>

        {enrollments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center py-32 glass-card rounded-[2rem] border border-white/5 bg-black/40 relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[80px] -z-10" />
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <TrendingUp className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter mb-4 text-white">Your terminal is empty</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto font-medium">
              Start your trading journey today by exploring our premium courses tailored for all experience levels.
            </p>
            <Link href="/courses">
              <Button size="lg" className="h-14 px-8 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(23,163,74,0.3)] transition-all group overflow-hidden relative">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="flex items-center gap-2 relative z-10">
                  Access Programs <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Main Action Area */}
            <div className="lg:col-span-8 space-y-8">
              {activeEnrollment && activeEnrollment.course && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" /> Current Objective
                  </h2>
                  
                  <div className="glass-card rounded-[2rem] border border-white/10 bg-black/60 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row">
                      {/* Image Thumbnail */}
                      <div className="w-full md:w-2/5 relative h-64 md:h-auto overflow-hidden">
                        <img src={activeEnrollment.course.thumbnail_url} alt={activeEnrollment.course.title} className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/50 to-transparent" />
                        
                        {/* Overlay Play Icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                            <PlayCircle className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-8 md:p-10 flex-1 flex flex-col relative z-10 -mt-16 md:mt-0">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20 bg-primary/10 text-primary">
                            In Progress
                          </span>
                        </div>
                        
                        <h3 className="text-3xl font-black tracking-tighter mb-3 leading-tight">{activeEnrollment.course.title}</h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-8 line-clamp-2">
                          {activeEnrollment.course.description}
                        </p>
                        
                        <div className="mt-auto space-y-5">
                          <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3">
                              <span className="text-muted-foreground">Completion</span>
                              <span className="text-white">{activeEnrollment.calculated_progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${activeEnrollment.calculated_progress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-primary/50 to-primary relative"
                              >
                                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-[shimmer_2s_infinite]" />
                              </motion.div>
                            </div>
                          </div>
                          
                          <Link href={`/dashboard/courses/${activeEnrollment.course_id}`} className="block">
                            <Button className="w-full h-14 rounded-xl text-base font-bold bg-white text-black hover:bg-gray-200 transition-colors shadow-xl group">
                              <span className="flex items-center gap-2">
                                Initialize Module <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar Stats */}
            <div className="lg:col-span-4 space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Telemetry
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                    <BookOpen className="w-6 h-6 text-primary mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black tracking-tighter text-white mb-1">{enrollments.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Programs</div>
                  </div>
                  
                  <div className="glass-card p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                    <Clock className="w-6 h-6 text-blue-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black tracking-tighter text-white mb-1">--</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hours</div>
                  </div>
                  
                  <div className="glass-card p-6 rounded-2xl border border-white/5 bg-white/[0.02] col-span-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[40px] rounded-full pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">Certifications</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70">Locked</div>
                        </div>
                      </div>
                      <Lock className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommended.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-12 mt-12 border-t border-white/5"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tighter">Recommended Modules</h2>
              <Link href="/courses" className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommended.map((course, idx) => (
                <motion.div 
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.1) }}
                >
                  <Link href={`/courses/${course.slug}`} className="block h-full">
                    <div className="glass-card rounded-[1.5rem] border border-white/5 bg-black/40 overflow-hidden group h-full flex flex-col hover:border-white/10 transition-colors">
                      <div className="h-48 w-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                        <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 left-4 z-20">
                          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20 bg-black/50 backdrop-blur-md text-white">
                            {course.level}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h4 className="text-lg font-bold mb-2 leading-tight group-hover:text-primary transition-colors">{course.title}</h4>
                        <p className="text-sm font-medium text-muted-foreground line-clamp-2 mb-6 flex-1">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-bold">₹{course.price.toLocaleString("en-IN")}</span>
                          <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
