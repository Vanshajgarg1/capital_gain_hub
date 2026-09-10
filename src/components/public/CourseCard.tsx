import Image from "next/image";
import Link from "next/link";
import { CinematicVideo } from "@/components/public/CinematicVideo";
import { Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "beginner": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "intermediate": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "advanced": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Link href={`/courses/${course.slug}`} className="block group h-full">
      <div className={cn(
        "relative h-full flex flex-col rounded-3xl overflow-hidden glass-card transition-all duration-500",
        "border border-white/5 bg-black/40 hover:bg-white/[0.02] hover:border-white/10",
        course.is_featured ? "ring-1 ring-primary/30 shadow-[0_0_30px_rgba(23,163,74,0.15)]" : ""
      )}>
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/5 transition-colors duration-500 z-0" />
        
        {/* Video/Image Container */}
        <div className="relative h-[220px] w-full overflow-hidden shrink-0 z-10 group rounded-t-3xl">
          <CinematicVideo
            src={undefined}
            fallbackImage={course.thumbnail_url}
            hoverScale={true}
            overlay={true}
            className="absolute inset-0"
          />

          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
            <span className={cn(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border backdrop-blur-md",
              getLevelColor(course.level)
            )}>
              {course.level}
            </span>
            
            {course.is_featured && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(23,163,74,0.5)]">
                <Sparkles className="w-3 h-3" />
                Featured
              </span>
            )}
          </div>
        </div>
        
        {/* Content Container */}
        <div className="p-6 md:p-8 flex flex-col flex-1 z-10 relative">
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </h3>
          
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-6 flex-1">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-8">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>{course.modules?.length || 5} Modules</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <Clock className="w-4 h-4 text-primary" />
              <span>{course.duration}</span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Investment</span>
              <span className="font-black text-2xl tracking-tighter text-white">
                ₹{course.price.toLocaleString("en-IN")}
              </span>
            </div>
            
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
              "bg-white/5 text-white border border-white/10",
              "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(23,163,74,0.3)]"
            )}>
              <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
