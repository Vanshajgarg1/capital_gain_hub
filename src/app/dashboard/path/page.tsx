"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Loader2, PlayCircle, Trophy, CheckCircle2, Lock, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getMyEnrollments, getDetailedCourseProgress, DetailedCourseProgress } from "@/lib/api/courses";
import { Enrollment } from "@/types";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentLearningPathPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressData, setProgressData] = useState<Record<string, DetailedCourseProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPath() {
      if (!user) return;
      try {
        const myEnrollments = await getMyEnrollments();
        setEnrollments(myEnrollments);
        
        if (myEnrollments.length > 0) {
          setSelectedCourseId(myEnrollments[0].course_id);
        }
        
        const progressMap: Record<string, DetailedCourseProgress> = {};
        for (const env of myEnrollments) {
          const p = await getDetailedCourseProgress(env.course_id);
          if (p) progressMap[env.course_id] = p;
        }
        setProgressData(progressMap);
      } catch (err) {
        console.error("Failed to load learning path", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadPath();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-black">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary rounded-full blur-[30px] opacity-20 animate-pulse" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10 mx-auto" />
          </div>
          <h2 className="text-xl font-black tracking-widest uppercase text-white/50">Mapping Waypoints...</h2>
        </div>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-0 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="p-6 md:p-10 pb-32 max-w-5xl mx-auto space-y-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Path</span></h1>
            <p className="text-xl text-muted-foreground font-medium mt-2">Your personalized curriculum and learning journey.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card rounded-[2rem] border border-white/5 bg-black/40 text-center p-16 relative overflow-hidden shadow-2xl">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[80px] -z-10" />
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter mb-4 text-white">No Waypoints Found</h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto font-medium">You haven't enrolled in any programs yet. Start your journey below.</p>
              <Link href="/courses">
                <Button size="lg" className="h-14 px-8 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(23,163,74,0.3)] transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span className="flex items-center gap-2 relative z-10">
                    Explore Programs <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const selectedProgress = selectedCourseId ? progressData[selectedCourseId] : null;
  const course = selectedProgress?.course;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pb-32">
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none -z-0 -translate-x-1/2 translate-y-1/4" />
      
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(23,163,74,0.8)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Tactical Map</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Path</span></h1>
          <p className="text-xl text-muted-foreground font-medium">Your structured curriculum and tactical waypoints.</p>
        </motion.div>

        {enrollments.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none"
          >
            {enrollments.map((env) => (
              <Button
                key={env.id}
                variant={selectedCourseId === env.course_id ? "default" : "secondary"}
                onClick={() => setSelectedCourseId(env.course_id)}
                className={cn(
                  "shrink-0 h-12 px-6 rounded-xl text-sm font-bold tracking-wide transition-all",
                  selectedCourseId === env.course_id 
                    ? "bg-white text-black shadow-lg" 
                    : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                )}
              >
                {env.course?.title || "Course"}
              </Button>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {selectedProgress && course && (
            <motion.div 
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-12"
            >
              {/* Course Header */}
              <div className="glass-card rounded-[2rem] border border-white/10 bg-black/60 overflow-hidden relative group shadow-2xl">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-2/5 relative h-64 md:h-auto overflow-hidden">
                    {course.thumbnail_url ? (
                      <>
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.title}
                          className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/50 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-8 md:p-12 flex-1 flex flex-col justify-center relative z-10 -mt-16 md:mt-0">
                    <span className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20 bg-primary/10 text-primary w-fit mb-4">
                      {course.level}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">{course.title}</h2>
                    
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      <span>{selectedProgress.completedLessons} / {selectedProgress.totalLessons} Waypoints</span>
                      <span className="text-white">{selectedProgress.progressPercentage}% Complete</span>
                    </div>
                    
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 mb-8">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedProgress.progressPercentage}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary/50 to-primary relative"
                      >
                        <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-[shimmer_2s_infinite]" />
                      </motion.div>
                    </div>
                    
                    <div>
                      {selectedProgress.nextLessonId ? (
                        <Link href={`/dashboard/courses/${course.id}?lessonId=${selectedProgress.nextLessonId}`}>
                          <Button className="w-full sm:w-auto h-14 px-8 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(23,163,74,0.3)] transition-all group/btn overflow-hidden relative">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                            <span className="flex items-center gap-2 relative z-10">
                              Continue Mission <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </span>
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/dashboard/courses/${course.id}`}>
                          <Button className="w-full sm:w-auto h-14 px-8 rounded-xl text-base font-bold bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all group/btn">
                            <span className="flex items-center gap-2">
                              Mission Accomplished <Trophy className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            </span>
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Curriculum Roadmap */}
              <div className="space-y-8 pt-8">
                <h3 className="text-3xl font-black tracking-tighter px-4 md:px-0">Tactical Roadmap</h3>
                
                <div className="space-y-12 ml-4 md:ml-8 border-l-2 border-white/10 pl-8 md:pl-12 relative">
                  {selectedProgress.modules.map((module, mIndex) => (
                    <div key={module.id} className="relative group/module">
                      {/* Module Dot */}
                      <div className="absolute -left-[45px] md:-left-[61px] top-0 flex items-center justify-center w-8 h-8 rounded-full border-[6px] border-black bg-white/10 text-muted-foreground shadow z-10 group-hover/module:bg-white/20 transition-colors">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full transition-colors",
                          module.progressPercentage === 100 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : 
                          module.progressPercentage > 0 ? "bg-primary shadow-[0_0_10px_rgba(23,163,74,0.8)]" : "bg-white/30"
                        )} />
                      </div>

                      <div className="mb-6 bg-white/[0.02] border border-white/5 p-6 rounded-2xl group-hover/module:bg-white/[0.04] group-hover/module:border-white/10 transition-colors">
                        <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">
                          Phase {String(mIndex + 1).padStart(2, '0')}
                        </div>
                        <h4 className="text-2xl font-bold tracking-tight mb-4 text-white">{module.title}</h4>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="h-1.5 w-full sm:w-64 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: `${module.progressPercentage}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={cn(
                                "h-full",
                                module.progressPercentage === 100 ? "bg-emerald-500" : "bg-primary"
                              )}
                            />
                          </div>
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-12">
                              {module.progressPercentage}%
                            </span>
                            <span className="text-xs font-medium text-white/50">
                              {module.completedLessons} / {module.totalLessons} Waypoints
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lessons */}
                      <div className="space-y-4 pt-2">
                        {module.lessons.map((lesson) => {
                          if (lesson.isCompleted) {
                            return (
                              <div key={lesson.id} className="glass-card border-white/5 bg-white/[0.01] p-5 rounded-xl flex items-center justify-between opacity-60 hover:opacity-100 hover:bg-white/[0.03] transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-white/70 line-through decoration-white/20">{lesson.title}</h5>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1 block">Secured</span>
                                  </div>
                                </div>
                                <Link href={`/dashboard/courses/${course.id}?lessonId=${lesson.id}`}>
                                  <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-bold bg-transparent border-white/10 text-white hover:bg-white/10">Access Logs</Button>
                                </Link>
                              </div>
                            );
                          }

                          if (lesson.isCurrent) {
                            return (
                              <div key={lesson.id} className="glass-card border-primary/30 bg-primary/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(23,163,74,0.15)] relative overflow-hidden group">
                                <div className="absolute inset-y-0 left-0 w-1.5 bg-primary shadow-[0_0_10px_rgba(23,163,74,0.8)]" />
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                                
                                <div className="flex items-center gap-4 relative z-10 pl-2">
                                  <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                                    <span className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border border-white/20 relative z-10 shadow-lg">
                                      <PlayCircle className="w-5 h-5 text-white ml-0.5" />
                                    </div>
                                  </div>
                                  <div>
                                    <h5 className="font-black text-lg text-white group-hover:text-primary transition-colors">{lesson.title}</h5>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse mt-1 block">Active Waypoint</span>
                                  </div>
                                </div>
                                <Link href={`/dashboard/courses/${course.id}?lessonId=${lesson.id}`} className="relative z-10">
                                  <Button size="sm" className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold bg-white text-black hover:bg-gray-200 shadow-xl group/btn">
                                    Engage <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                  </Button>
                                </Link>
                              </div>
                            );
                          }

                          // Locked
                          return (
                            <div key={lesson.id} className="border border-white/5 bg-black/60 p-5 rounded-xl flex items-center justify-between opacity-40">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-muted-foreground">{lesson.title}</h5>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1 block">Encrypted</span>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" disabled className="h-9 px-4 text-xs font-bold border-white/5 bg-transparent text-muted-foreground">Locked</Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
