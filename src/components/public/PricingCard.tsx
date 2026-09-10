import { CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle2, BookOpen, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Course } from "@/types";
import { cn } from "@/lib/utils";
import { CinematicVideo } from "@/components/public/CinematicVideo";

interface PricingCardProps {
  course: Course;
  isFeatured?: boolean;
}

export function PricingCard({ course, isFeatured }: PricingCardProps) {
  // Use DB is_featured if available, else fallback to frontend logic
  const featured = course.is_featured || isFeatured;

  return (
    <div className={cn(
      "relative flex flex-col h-full rounded-3xl overflow-hidden glass-card transition-all duration-500 group",
      "border border-white/5 bg-black/40 hover:bg-white/[0.02] hover:border-white/10",
      featured ? "ring-1 ring-primary shadow-[0_0_40px_rgba(23,163,74,0.15)] scale-105 z-10" : ""
    )}>
      {/* Animated glow background */}
      {featured && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyan-400 to-blue-500 blur-xl opacity-20 animate-pulse pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 hover:from-primary/5 transition-colors duration-500 z-0 pointer-events-none" />
      
      {/* Cinematic Background Video */}
      <div className="absolute inset-0 z-0 opacity-40">
        <CinematicVideo
          src={undefined}
          fallbackImage={course.thumbnail_url}
          hoverScale={true}
          overlay={true}
          className="absolute inset-0"
        />
      </div>
      
      {featured && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-b-xl shadow-[0_0_20px_rgba(23,163,74,0.4)] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Recommended
          </span>
        </div>
      )}
      
      <CardHeader className="text-center pb-6 pt-12 relative z-10 border-b border-white/5">
        <div className="mb-4 flex justify-center">
          <span className={cn(
            "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border backdrop-blur-md",
            course.level?.toLowerCase() === "beginner" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            course.level?.toLowerCase() === "intermediate" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
            course.level?.toLowerCase() === "advanced" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
            "bg-primary/10 text-primary border-primary/20"
          )}>
            {course.level}
          </span>
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-white mb-2">{course.title}</h3>
        <p className="text-muted-foreground text-sm h-10 line-clamp-2">{course.description}</p>
      </CardHeader>
      
      <CardContent className="flex-1 pt-6 relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <span className="text-5xl font-extrabold text-white">₹{course.price.toLocaleString("en-IN")}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">One-Time Payment</span>
        </div>
        
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-foreground/90 font-medium">{course.modules?.length || 5} Detailed Modules</span>
          </li>
          {course.duration && (
            <li className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90 font-medium">{course.duration} of Video Content</span>
            </li>
          )}
          <li className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-foreground/90 font-medium">Lifetime Access & Updates</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-foreground/90 font-medium">Community Access</span>
          </li>
        </ul>
      </CardContent>
      
      <CardFooter className="relative z-10 pb-8 pt-6">
        <Link 
          href={`/courses/${course.slug}`} 
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full font-bold h-12 rounded-xl transition-all duration-300 flex items-center justify-center",
            featured 
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(23,163,74,0.3)] hover:shadow-[0_0_30px_rgba(23,163,74,0.5)]" 
              : "bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
          )} 
        >
          Explore Program
        </Link>
      </CardFooter>
    </div>
  );
}
