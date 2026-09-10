"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import { PremiumCTA } from "@/components/ui/animations/PremiumCTA";
import { useEffect, useRef } from "react";

const Counter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 50, stiffness: 100 });
  const rounded = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  return (
    <span ref={ref} className="text-2xl font-bold flex">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
};

export function HeroSection({ studentCount = 0, lessonCount = 0 }: { studentCount?: number, lessonCount?: number }) {
  const displayStudentCount = studentCount;
  const studentSuffix = studentCount >= 100 ? "+" : "";
  const studentsText = "Students";
  const learnerGoalText = studentCount < 100 ? "100+ Learner Goal" : "1000+ Learner Goal";

  return (
    <section className="relative min-h-[90vh] overflow-hidden flex items-center pt-32 pb-20 md:pt-48 md:pb-32">
      {/* BACKGROUND VIDEO */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover z-0"
        src="/videos/capital-gain-hub-hero.mp4"
      />
      
      {/* OVERLAYS */}
      <div className="absolute inset-0 bg-black/60 mix-blend-multiply z-[1]" />
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-background/80 to-background z-[1]" />
      
      {/* Ambient Glows */}
      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none z-[1] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none z-[1] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* CONTENT */}
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Content */}
          <div className="flex flex-col space-y-8 max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center rounded-full border border-primary/30 bg-black/40 backdrop-blur-md px-4 py-2 text-sm font-medium text-primary w-fit shadow-[0_0_20px_rgba(23,163,74,0.2)]"
            >
              <span className="flex h-2 w-2 rounded-full bg-primary mr-3 animate-pulse"></span>
              Join {studentCount > 0 ? studentCount.toLocaleString() : "Our"} Active Learners
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white"
            >
              Master Trading. <br/>
              <span className="fintech-gradient glow-text inline-block mt-2">Build Your Edge.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-xl text-white/80 leading-relaxed max-w-xl font-medium"
            >
              Learn trading from the fundamentals to advanced strategies through a structured, practical learning journey. Stop guessing, start executing.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Link href="/courses">
                <PremiumCTA className="w-full sm:w-auto text-lg h-14 px-8 shadow-[0_0_30px_rgba(23,163,74,0.3)] hover:shadow-[0_0_40px_rgba(23,163,74,0.5)]">
                  Explore Courses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </PremiumCTA>
              </Link>
              <Link href="#youtube">
                <motion.div 
                  role="button"
                  tabIndex={0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border border-white/20 bg-black/40 hover:bg-white/10 transition-all flex items-center justify-center font-semibold backdrop-blur-md text-white shadow-lg cursor-pointer"
                >
                  <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                  Watch on YouTube
                </motion.div>
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="flex items-center gap-8 pt-8 border-t border-white/10"
            >
              <div className="flex flex-col">
                <Counter value={lessonCount > 0 ? lessonCount : 100} suffix={lessonCount > 0 ? "" : "+"} />
                <span className="text-sm text-white/60 uppercase tracking-wider font-semibold">
                  {lessonCount === 1 ? "Lesson" : "Lessons"}
                </span>
              </div>
              <div className="w-px h-12 bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Beginner → Advanced</span>
                <span className="text-sm text-white/60 uppercase tracking-wider font-semibold">Structured Path</span>
              </div>
              <div className="w-px h-12 bg-white/10"></div>
              <div className="flex flex-col">
                <Counter value={displayStudentCount} suffix={studentSuffix} />
                <span className="text-sm text-white/60 uppercase tracking-wider font-semibold">
                  {studentsText}
                </span>
                <span className="text-[10px] text-primary/80 uppercase tracking-widest font-bold mt-1">
                  {learnerGoalText}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Visual: 2027 Futuristic Trading UI */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 10, y: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            className="relative hidden lg:block h-[600px] w-full perspective-1000"
          >
            <div className="absolute inset-0 flex items-center justify-center transform-gpu">
              <div className="relative w-full h-[450px] glass-card rounded-3xl p-6 shadow-[0_0_80px_rgba(23,163,74,0.15)] flex flex-col justify-between overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl">
                {/* Simulated Trading Header */}
                <div className="flex justify-between items-center z-20 border-b border-white/10 pb-4 mb-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                      <div className="w-3 h-3 bg-primary rounded-full animate-ping" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg leading-tight text-white">MARKET ALPHA</h4>
                      <p className="text-xs text-primary font-mono font-bold tracking-widest">+4.28% LIVE</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-white/10 rounded-md animate-pulse" />
                    <div className="h-6 w-16 bg-white/10 rounded-md animate-pulse delay-150" />
                  </div>
                </div>

                {/* Abstract Candlesticks */}
                <div className="flex-1 flex items-end gap-2 z-10 relative">
                  {[...Array(14)].map((_, i) => {
                    const isGreen = [true, true, false, true, true, false, true, true, true, false, true, false, true, true][i % 14];
                    const height = [45, 60, 25, 70, 50, 30, 80, 40, 65, 20, 55, 35, 75, 45][i % 14];
                    const offset = [10, 20, 5, 30, 15, 0, 25, 10, 35, 5, 20, 15, 5, 25][i % 14];
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "100%", opacity: 1 }}
                        transition={{ duration: 1, delay: 0.6 + (i * 0.05), ease: "easeOut" }}
                        className="flex-1 flex flex-col items-center justify-end relative h-full group"
                      >
                        <div 
                          className={`w-px h-full absolute top-0 ${isGreen ? 'bg-primary/30' : 'bg-destructive/30'} group-hover:bg-white/80 transition-colors`}
                          style={{ height: `${height + offset + 20}%` }}
                        ></div>
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className={`w-full rounded-sm z-10 shadow-lg ${isGreen ? 'bg-primary shadow-primary/40' : 'bg-destructive shadow-destructive/40'}`} 
                          style={{ height: `${height}%`, marginBottom: `${offset}%` }}
                        ></motion.div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Overlay lines and grid */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] bg-[size:24px_24px] z-0 pointer-events-none"></div>
                
                {/* Floating glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] z-0 mix-blend-screen pointer-events-none"></div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
