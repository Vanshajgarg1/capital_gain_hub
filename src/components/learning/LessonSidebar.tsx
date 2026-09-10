"use client";

import { Course, Lesson, Module, LessonProgress } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, Lock, PlayCircle, ChevronLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LessonSidebarProps {
  course: Course;
  activeLessonId: string | null;
  progressMap: Record<string, LessonProgress>;
  onSelectLesson: (lessonId: string) => void;
}

export function LessonSidebar({ course, activeLessonId, progressMap, onSelectLesson }: LessonSidebarProps) {
  // Calculate progress stats for the sidebar header
  let totalLessons = 0;
  let completedCount = 0;
  
  if (course.modules) {
    course.modules.forEach(m => {
      if (m.lessons) {
        totalLessons += m.lessons.length;
        m.lessons.forEach(l => {
          if (progressMap[l.id]?.is_completed) {
            completedCount++;
          }
        });
      }
    });
  }
  
  const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col bg-black border-l border-white/5 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none z-0" />
      
      <div className="p-6 md:p-8 border-b border-white/5 shrink-0 relative z-10 bg-black/40 backdrop-blur-md">
        <Link href="/dashboard" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white mb-6 transition-colors group">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Dashboard
        </Link>
        <h2 className="font-black text-2xl tracking-tight leading-tight mb-6 text-white">{course.title}</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="text-primary">{percentage}%</span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              className="bg-gradient-to-r from-primary/50 to-primary h-full relative" 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
          <div className="text-[10px] font-bold text-muted-foreground text-right tracking-widest uppercase">
            {completedCount} of {totalLessons} modules completed
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 relative z-10">
        <div className="p-4 md:p-6 pb-32">
          <Accordion defaultValue={course.modules?.map(m => m.id)} className="w-full space-y-4">
            {course.modules?.map((module, mIdx) => (
              <AccordionItem key={module.id} value={module.id} className="border border-white/5 rounded-2xl bg-white/[0.01] overflow-hidden data-[state=open]:bg-white/[0.02] transition-colors">
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/[0.02] transition-colors [&[data-state=open]>div>svg]:rotate-180">
                  <div className="flex items-center justify-between w-full pr-2 gap-4">
                    <div className="flex flex-col items-start text-left gap-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Module {String(mIdx + 1).padStart(2, '0')}</span>
                      <span className="text-sm font-bold text-white leading-tight">{module.title}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-3 px-2">
                  <div className="space-y-1">
                    {module.lessons?.map((lesson, lIdx) => {
                      const isCurrent = lesson.id === activeLessonId;
                      const isCompleted = progressMap[lesson.id]?.is_completed;
                      
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onSelectLesson(lesson.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300 group",
                            isCurrent ? 'bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(23,163,74,0.1)]' : 'hover:bg-white/5 border border-transparent hover:border-white/5 text-muted-foreground'
                          )}
                        >
                          <div className="shrink-0 flex items-center justify-center">
                            {isCompleted ? (
                              <CheckCircle2 className={cn("w-5 h-5", isCurrent ? 'text-primary' : 'text-emerald-500')} />
                            ) : isCurrent ? (
                              <div className="relative flex items-center justify-center w-5 h-5">
                                <span className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
                                <PlayCircle className="w-5 h-5 text-primary relative z-10" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-colors" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className={cn(
                              "text-sm block leading-tight truncate transition-colors",
                              isCurrent ? 'font-bold text-white' : 'font-medium group-hover:text-white',
                              isCompleted && !isCurrent ? 'text-white/70' : ''
                            )}>
                              {String(lIdx + 1).padStart(2, '0')}. {lesson.title}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest mt-1 block",
                              isCurrent ? 'text-primary/70' : 'text-muted-foreground/50 group-hover:text-muted-foreground'
                            )}>
                              {Math.floor(lesson.duration / 60)} mins
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}
