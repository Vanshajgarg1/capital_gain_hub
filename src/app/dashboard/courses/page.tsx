"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, BookOpen, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getMyEnrollments, getCourseProgress } from "@/lib/api/courses";
import { Enrollment } from "@/types";
import { motion } from "framer-motion";

interface EnrollmentWithProgress extends Enrollment {
  calculated_progress: number;
}

export default function DashboardCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [enrollments, setEnrollments] = useState<EnrollmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
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
      } catch (error) {
        console.error("Failed to load courses:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadCourses();
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
          <h2 className="text-2xl font-black tracking-widest uppercase text-white/50">Fetching Encrypted Data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      {/* Cinematic Ambient Background */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      
      <div className="p-6 md:p-10 max-w-7xl mx-auto relative z-10 space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-6 border-b border-white/5"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Learning Database</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">My <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Programs</span></h1>
          <p className="text-xl text-muted-foreground font-medium">Access your enrolled curriculum and continue your training.</p>
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
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter mb-4 text-white">No active enrollments</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto font-medium">
              Start your trading journey today by exploring our premium courses tailored for all experience levels.
            </p>
            <Link href="/courses">
              <Button size="lg" className="h-14 px-8 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(23,163,74,0.3)] transition-all group overflow-hidden relative">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="flex items-center gap-2 relative z-10">
                  Explore Programs <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {enrollments.map((enr, idx) => (
              enr.course && (
                <motion.div
                  key={enr.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (idx * 0.1) }}
                >
                  <Card className="glass-card h-full overflow-hidden border-white/5 bg-black/40 hover:bg-white/[0.02] hover:border-white/10 transition-all duration-500 flex flex-col group rounded-[1.5rem] shadow-xl">
                    <div className="relative h-56 w-full overflow-hidden">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10" />
                      <img 
                        src={enr.course.thumbnail_url} 
                        alt={enr.course.title} 
                        className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
                        <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                          <PlayCircle className="w-8 h-8 text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-8 flex-1 flex flex-col relative z-10 bg-gradient-to-t from-black via-black to-transparent">
                      <div className="mb-4">
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20 bg-primary/10 text-primary">
                          Active
                        </span>
                      </div>
                      
                      <h3 className="text-2xl font-black tracking-tighter mb-3 leading-tight group-hover:text-primary transition-colors">
                        {enr.course.title}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground mb-8 line-clamp-2 flex-1">
                        {enr.course.description}
                      </p>
                      
                      <div className="mt-auto space-y-5">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3">
                            <span className="text-muted-foreground">Completion</span>
                            <span className="text-white">{enr.calculated_progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${enr.calculated_progress}%` }}
                              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-primary/50 to-primary relative"
                            >
                              <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-[shimmer_2s_infinite]" />
                            </motion.div>
                          </div>
                        </div>
                        
                        <Link href={`/dashboard/courses/${enr.course_id}`}>
                          <Button className="w-full h-12 rounded-xl text-sm font-bold bg-white text-black hover:bg-gray-200 transition-colors shadow-xl group/btn">
                            <span className="flex items-center gap-2">
                              {enr.calculated_progress === 0 ? "Initialize" : "Resume"} <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </span>
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
