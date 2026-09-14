"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Course, Lesson, LessonProgress } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getCourseLessonProgress, getEnrollment, upsertLessonProgress } from "@/lib/api/courses";
import { VideoPlayer } from "@/components/learning/VideoPlayer";
import { LessonSidebar } from "@/components/learning/LessonSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, CheckCircle2, Menu, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
interface LearningClientViewProps {
  course: Course;
}

export default function LearningClientView({ course }: LearningClientViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlLessonId = searchParams.get("lessonId");
  
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const certCheckDone = useRef(false);

  // Flatten lessons for easy Prev/Next navigation
  const allLessons = useMemo(() => {
    const list: Lesson[] = [];
    if (course.modules) {
      course.modules.forEach(m => {
        if (m.lessons) {
          list.push(...m.lessons);
        }
      });
    }
    return list;
  }, [course]);

  useEffect(() => {
    async function initLearningState() {
      if (!user) return;
      
      try {
        const enrollment = await getEnrollment(course.id);
        if (!enrollment) {
          setIsEnrolled(false);
          setLoading(false);
          return;
        }
        
        setIsEnrolled(true);
        
        // Fetch all progress
        const progressList = await getCourseLessonProgress(course.id);
        const map: Record<string, LessonProgress> = {};
        let latestLessonId: string | null = null;
        let latestDate = 0;
        
        progressList.forEach((p: any) => {
           map[p.lesson_id] = p;
           // find the most recently interacted lesson to resume
           const updated = new Date(p.completed_at || p.last_watched_position > 0 ? Date.now() : 0).getTime();
           if (updated > latestDate && !p.is_completed) {
             latestDate = updated;
             latestLessonId = p.lesson_id;
           }
        });
        
        setProgressMap(map);
        
        // Determine initial active lesson
        if (allLessons.length > 0) {
          if (urlLessonId && allLessons.find(l => l.id === urlLessonId)) {
            setActiveLessonId(urlLessonId);
          } else if (latestLessonId && allLessons.find(l => l.id === latestLessonId)) {
            setActiveLessonId(latestLessonId);
          } else {
            // Find first incomplete lesson
            const firstIncomplete = allLessons.find(l => !map[l.id]?.is_completed);
            setActiveLessonId(firstIncomplete ? firstIncomplete.id : allLessons[0].id);
          }
        }
        
      } catch (error) {
        console.error("Failed to initialize learning state:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (!authLoading) {
      if (!user) {
        setLoading(false); // will trigger not enrolled state
      } else {
        initLearningState();
      }
    }
  }, [user, authLoading, course.id, allLessons, urlLessonId]);

  // Derived state
  const activeLessonIndex = allLessons.findIndex(l => l.id === activeLessonId);
  const activeLesson = activeLessonIndex >= 0 ? allLessons[activeLessonIndex] : null;
  const previousLesson = activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] : null;
  const nextLesson = activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] : null;

  const lastSaveTimeRef = useRef<number>(0);
  const lastSavedPositionRef = useRef<number>(-1);

  const handleProgress = async (currentTime: number) => {
    if (!activeLesson) return;
    
    const now = Date.now();
    const currentPosition = Math.round(currentTime);
    
    // Throttle saves to every 5 seconds, unless position jumped significantly (e.g. seeking)
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const positionDiff = Math.abs(currentPosition - lastSavedPositionRef.current);
    
    if (timeSinceLastSave < 5000 && positionDiff < 5) {
      return;
    }
    
    lastSaveTimeRef.current = now;
    lastSavedPositionRef.current = currentPosition;
    
    const currentProg = progressMap[activeLesson.id];
    
    try {
      const data = await upsertLessonProgress(activeLesson.id, { 
        last_watched_position: currentPosition,
        is_completed: currentProg?.is_completed || false,
        completed_at: currentProg?.completed_at || null
      });
      
      setProgressMap(prev => ({
        ...prev,
        [activeLesson.id]: data
      }));
    } catch (e: any) {
      console.error("Failed to save progress", e);
    }
  };

  const triggerCertificateGeneration = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ course_id: course.id })
      });
    } catch (error) {
      console.error("Silent certificate generation failed:", error);
    }
  };

  useEffect(() => {
    if (!certCheckDone.current && allLessons.length > 0) {
      const totalLessons = allLessons.length;
      const completedCount = allLessons.filter(l => progressMap[l.id]?.is_completed).length;
      if (completedCount === totalLessons && totalLessons > 0) {
        certCheckDone.current = true;
        triggerCertificateGeneration();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLessons, progressMap]);

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    
    const now = new Date().toISOString();
    const currentProg = progressMap[activeLesson.id];
    
    try {
      const data = await upsertLessonProgress(activeLesson.id, { 
        is_completed: true, 
        completed_at: now,
        last_watched_position: currentProg?.last_watched_position || 0
      });
      
      setProgressMap(prev => ({
        ...prev,
        [activeLesson.id]: data
      }));
      
      // Auto-advance to next lesson if available
      if (nextLesson) {
        setActiveLessonId(nextLesson.id);
      } else {
        // Last lesson completed! Trigger certificate generation silently
        triggerCertificateGeneration();
      }
    } catch (e: any) {
      console.error("Failed to mark complete", e);
      alert("Error saving progress: " + (e.message || JSON.stringify(e)));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary rounded-full blur-[30px] opacity-20 animate-pulse" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10 mx-auto" />
          </div>
          <h2 className="text-xl font-black tracking-widest uppercase text-white/50">Establishing Secure Connection...</h2>
        </div>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] -z-10" />
        <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 text-white">Access Denied</h1>
        <p className="text-muted-foreground mb-10 max-w-md font-medium text-lg">
          You need clearance to access the encrypted modules for "<span className="text-white">{course.title}</span>".
        </p>
        <Link href={`/courses/${course.slug}`}>
          <Button size="lg" className="h-14 px-8 rounded-xl text-base font-bold bg-white text-black hover:bg-gray-200 transition-colors shadow-xl">
            Request Access
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Ambient Effect */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay z-0 pointer-events-none" />
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden p-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-40 bg-black/80 backdrop-blur-xl">
        <h2 className="font-bold truncate max-w-[200px] text-sm text-primary tracking-wide uppercase">{course.title}</h2>
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-white/5 border-white/10" />
            }
          >
            <Menu className="w-4 h-4" />
            Terminal Menu
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-80 bg-black/95 border-l border-white/10 backdrop-blur-3xl">
            <LessonSidebar 
              course={course} 
              activeLessonId={activeLessonId} 
              progressMap={progressMap} 
              onSelectLesson={(id) => setActiveLessonId(id)} 
            />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-[calc(100vh-65px)] lg:min-h-screen relative z-10">
        
        {/* Video Player Section with cinematic wrapper */}
        <div className="w-full bg-black relative shadow-2xl border-b border-white/5">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none z-0" />
          <div className="relative z-10 max-w-[1400px] mx-auto 2xl:py-8 2xl:px-8">
            <div className="rounded-none 2xl:rounded-2xl overflow-hidden ring-1 ring-white/5 shadow-2xl bg-black">
              <VideoPlayer 
                provider={activeLesson?.video_provider}
                videoId={activeLesson?.video_id}
                lessonId={activeLesson?.id}
                courseId={course.id}
                initialTime={activeLesson ? (progressMap[activeLesson.id]?.last_watched_position || 0) : 0}
                onProgress={handleProgress}
                onEnded={handleMarkComplete}
              />
            </div>
          </div>
        </div>

        {/* Lesson Details */}
        <div className="p-6 md:p-10 max-w-5xl w-full mx-auto flex-1 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeLesson?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20 bg-primary/10 text-primary">
                    Module {activeLessonIndex + 1}
                  </span>
                  {progressMap[activeLesson?.id || ""]?.is_completed && (
                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">{activeLesson?.title || "Lesson Title"}</h1>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">{activeLesson?.description || "No description provided."}</p>
              </div>

              {/* Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-y border-white/10 bg-white/[0.01] -mx-6 md:-mx-10 px-6 md:px-10">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto h-12 bg-transparent border-white/10 hover:bg-white/5 text-white font-bold"
                  disabled={!previousLesson}
                  onClick={() => previousLesson && setActiveLessonId(previousLesson.id)}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" /> Previous Lesson
                </Button>
                
                <Button 
                  onClick={handleMarkComplete}
                  disabled={!activeLesson || progressMap[activeLesson.id]?.is_completed}
                  className={cn(
                    "w-full sm:w-auto h-12 px-8 font-bold text-base transition-all",
                    progressMap[activeLesson?.id || ""]?.is_completed 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] opacity-100 cursor-default' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(23,163,74,0.3)]'
                  )}
                >
                  <CheckCircle2 className={cn("w-5 h-5 mr-2", progressMap[activeLesson?.id || ""]?.is_completed ? "text-emerald-500" : "")} /> 
                  {progressMap[activeLesson?.id || ""]?.is_completed ? "Lesson Completed" : "Mark as Complete"}
                </Button>
                
                <Button 
                  className="w-full sm:w-auto h-12 bg-white text-black hover:bg-gray-200 font-bold border-0 shadow-lg"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
                >
                   {nextLesson ? "Next Lesson" : "Course Complete"} <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>


            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-[400px] border-l border-white/5 sticky top-0 h-screen shrink-0 bg-black/90 backdrop-blur-xl z-20">
        <LessonSidebar 
          course={course} 
          activeLessonId={activeLessonId} 
          progressMap={progressMap} 
          onSelectLesson={(id) => setActiveLessonId(id)} 
        />
      </div>
    </div>
  );
}
