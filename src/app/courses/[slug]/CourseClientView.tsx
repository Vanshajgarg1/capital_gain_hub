"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Course } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getEnrollment } from "@/lib/api/courses";
import { supabase } from "@/lib/supabase";
import { Button, buttonVariants } from "@/components/ui/button";
import { Clock, BookOpen, User, PlayCircle, Lock, Loader2, CheckCircle2, ChevronDown, Sparkles, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CinematicVideo } from "@/components/public/CinematicVideo";
import { VideoPlayer } from "@/components/learning/VideoPlayer";

interface CourseClientViewProps {
  course: Course;
}

export default function CourseClientView({ course }: CourseClientViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentCheckLoading, setEnrollmentCheckLoading] = useState(true);
  const [previewLesson, setPreviewLesson] = useState<any>(null);

  useEffect(() => {
    async function checkEnrollment() {
      if (!user) {
        setIsEnrolled(false);
        setEnrollmentCheckLoading(false);
        return;
      }
      
      try {
        const enrollment = await getEnrollment(course.id);
        setIsEnrolled(!!enrollment);
      } catch (error) {
        console.error("Failed to check enrollment:", error);
      } finally {
        setEnrollmentCheckLoading(false);
      }
    }

    if (!authLoading) {
      checkEnrollment();
    }
  }, [user, course.id, authLoading]);

  const handleEnroll = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (isEnrolled) {
      router.push(`/dashboard/courses/${course.id}`);
      return;
    }

    setIsEnrolling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      if (Number(course.price) === 0) {
        const res = await fetch("/api/enroll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ course_id: course.id }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === "ALREADY_ENROLLED") {
            setIsEnrolled(true);
            router.push(`/dashboard/courses/${course.id}`);
            return;
          }
          throw new Error(data.error || "Failed to enroll");
        }

        setIsEnrolled(true);
        router.push(`/dashboard/courses/${course.id}`);
      } else {
        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ course_id: course.id }),
        });

        const checkoutData = await checkoutRes.json();

        if (!checkoutRes.ok) {
          if (checkoutData.error === "ALREADY_ENROLLED") {
            setIsEnrolled(true);
            router.push(`/dashboard/courses/${course.id}`);
            return;
          } else if (checkoutData.error === "ORDER_COMPLETED_BUT_NOT_ENROLLED") {
            throw new Error("Your order was completed but enrollment is missing. Please contact support.");
          } else if (checkoutRes.status === 401 || checkoutData.error === "UNAUTHORIZED") {
            throw new Error("Unauthorized. Please log in again.");
          }
          throw new Error(checkoutData.error || "Checkout failed");
        }

        const options = {
          key: checkoutData.razorpay_key_id,
          amount: Math.round(Number(course.price) * 100),
          currency: "INR",
          name: "Capital Gain Hub",
          description: course.title,
          order_id: checkoutData.order.gateway_order_id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Payment verification failed");
              }
              
              setIsEnrolled(true);
              router.push(`/dashboard/courses/${course.id}`);
            } catch (err: any) {
              console.error("Verification error:", err);
              alert(err.message || "Verification failed");
            }
          },
          prefill: {
            name: user?.user_metadata?.full_name || "",
            email: user?.email || "",
          },
          theme: {
            color: "#3b82f6"
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any){
          console.error(response.error);
          alert("Payment failed. Please try again.");
        });
        rzp.open();
      }
    } catch (error: any) {
      console.error("Enrollment failed:", error);
      alert(error.message || "Failed to enroll. Please try again.");
    } finally {
      setIsEnrolling(false);
    }
  };

  let totalLessons = 0;
  let totalDurationSeconds = 0;
  if (course.modules) {
    course.modules.forEach(m => {
      totalLessons += (m.lessons?.length || 0);
      m.lessons?.forEach(l => {
        totalDurationSeconds += (l.duration || 0);
      });
    });
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return course.duration || "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  const derivedDuration = formatDuration(totalDurationSeconds);

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "beginner": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "intermediate": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "advanced": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="pb-32 bg-black min-h-screen font-sans text-white">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      {/* Course Hero - Cinematic 2027 Style */}
      <div className="relative pt-32 pb-20 md:pt-40 md:pb-32 border-b border-white/5 overflow-hidden">
        {/* Abstract Backgrounds */}
        <div className="absolute inset-0 bg-black z-0" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none -z-0 -translate-x-1/3 translate-y-1/3" />
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay z-0"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] bg-[size:64px_64px] z-0" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 space-y-8"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn(
                  "px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-full border backdrop-blur-md",
                  getLevelColor(course.level)
                )}>
                  {course.level}
                </span>
                {course.is_featured && (
                  <span className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest rounded-full">
                    <Sparkles className="w-3.5 h-3.5" />
                    Premium Program
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-white">
                {course.title}
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-medium">
                {course.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 pt-6">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-bold tracking-wide">{course.modules?.length || 0} <span className="text-muted-foreground font-normal">Modules</span></span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <PlayCircle className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold tracking-wide">{totalLessons} <span className="text-muted-foreground font-normal">Lessons</span></span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="font-bold tracking-wide">{derivedDuration} <span className="text-muted-foreground font-normal">Duration</span></span>
                </div>
              </div>
            </motion.div>

            {/* Premium Enrollment Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="w-full lg:w-[460px] shrink-0"
            >
              <div className="glass-card rounded-[2rem] p-3 border border-white/10 relative overflow-hidden bg-black/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] -z-10 pointer-events-none" />
                
                <div className="relative aspect-video rounded-[1.5rem] overflow-hidden mb-8 group z-0">
                  <CinematicVideo
                    src={undefined}
                    fallbackImage={course.thumbnail_url}
                    hoverScale={true}
                    overlay={true}
                    className="absolute inset-0"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[1.5rem] z-20 pointer-events-none" />
                </div>
                
                <div className="px-6 pb-6 space-y-8">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Investment</span>
                    <div className="flex items-start justify-center gap-1">
                      <span className="text-2xl font-bold text-white mt-1">₹</span>
                      <span className="text-6xl font-black tracking-tighter text-white">{course.price.toLocaleString("en-IN")}</span>
                    </div>
                    <span className="text-sm text-primary font-bold mt-2 bg-primary/10 px-3 py-1 rounded-full">Lifetime Access</span>
                  </div>
                  
                  {authLoading || enrollmentCheckLoading ? (
                    <Button size="lg" disabled className="w-full h-16 rounded-2xl text-lg font-bold bg-white/5 border border-white/10">
                      <Loader2 className="w-6 h-6 mr-3 animate-spin text-primary" />
                      Initializing...
                    </Button>
                  ) : !user ? (
                    <Link href="/login" className={cn("flex items-center justify-center w-full h-16 rounded-2xl text-lg font-bold bg-white text-black hover:bg-gray-200 transition-colors", buttonVariants({ size: "lg" }))}>
                        Login to Enroll
                    </Link>
                  ) : isEnrolled ? (
                    <Button 
                      size="lg" 
                      onClick={handleEnroll}
                      className="w-full h-16 rounded-2xl text-lg font-bold shadow-[0_0_30px_rgba(23,163,74,0.3)] bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.02] transition-all"
                    >
                      Enter Command Center
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                      className="w-full h-16 rounded-2xl text-lg font-bold shadow-[0_0_30px_rgba(23,163,74,0.3)] bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.02] transition-all relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      {isEnrolling ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Enroll Now"
                      )}
                    </Button>
                  )}
                  
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground pt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>30-Day Money-Back Guarantee</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <div className={cn("container mx-auto px-4 md:px-6 pt-24", 
        (course.features?.length || course.instructor_details?.name) ? "grid lg:grid-cols-12 gap-16" : "max-w-4xl"
      )}>
        <div className={cn("space-y-20", (course.features?.length || course.instructor_details?.name) ? "lg:col-span-8" : "")}>
          {(course.overview_heading || (course.learning_outcomes && course.learning_outcomes.length > 0)) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              {course.overview_heading && (
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-6">{course.overview_heading}</h2>
              )}
              {course.overview_description && (
                <p className="text-xl text-muted-foreground font-medium mb-10">{course.overview_description}</p>
              )}
              
              {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-6">
                  {course.learning_outcomes.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/10 transition-colors">
                      <div className="mt-0.5 bg-primary/10 p-2 rounded-xl text-primary shrink-0 border border-primary/20 shadow-[0_0_15px_rgba(23,163,74,0.15)]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-white/80 font-medium leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-10">Program Curriculum</h2>
            {course.modules && course.modules.length > 0 ? (
              <Accordion defaultValue={course.modules.map(m => m.id)} className="w-full space-y-6">
                {course.modules.map((module, mIdx) => (
                  <AccordionItem key={module.id} value={module.id} className="glass-card rounded-2xl border border-white/5 bg-black/40 overflow-hidden shadow-lg data-[state=open]:border-primary/20 transition-colors">
                    <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-white/5 transition-colors [&[data-state=open]>div>svg]:rotate-180">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex flex-col items-start text-left gap-2">
                          <span className="text-xs font-black tracking-widest uppercase text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Module {String(mIdx + 1).padStart(2, '0')}</span>
                          <span className="text-2xl font-bold tracking-tight">{module.title}</span>
                        </div>
                        <ChevronDown className="w-6 h-6 text-muted-foreground transition-transform duration-300" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-8 px-8">
                      <div className="space-y-3 mt-4">
                        {module.lessons?.map((lesson, lIdx) => (
                          <div key={lesson.id} className="group flex items-center justify-between p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                            <div className="flex items-center gap-6">
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground font-bold group-hover:text-white transition-colors border border-white/5">
                                {lIdx + 1}
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg group-hover:text-primary transition-colors">{lesson.title}</p>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {Math.floor(lesson.duration / 60)} mins
                                </p>
                              </div>
                            </div>
                            <div>
                              {lesson.is_free_preview ? (
                                <Button variant="outline" size="sm" className="h-10 px-4 rounded-lg font-bold border-white/10 bg-white/5 hover:bg-white/10 text-white" onClick={() => setPreviewLesson(lesson)}>
                                  <PlayCircle className="w-4 h-4 mr-2 text-primary" /> Preview
                                </Button>
                              ) : isEnrolled ? (
                                <Button variant="ghost" size="sm" className="h-10 px-4 rounded-lg font-bold text-primary hover:bg-primary/10 hover:text-primary" onClick={() => router.push(`/dashboard/courses/${course.id}`)}>
                                  <PlayCircle className="w-5 h-5 mr-2" /> Access Data
                                </Button>
                              ) : (
                                <div className="flex items-center text-sm font-bold tracking-wide text-muted-foreground bg-black/50 border border-white/5 px-4 py-2 rounded-lg">
                                  <Lock className="w-4 h-4 mr-2" />
                                  Encrypted
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="p-16 text-center glass-card rounded-3xl border border-white/5 bg-black/40">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Curriculum Encrypted</h3>
                <p className="text-muted-foreground text-lg">Detailed module information is currently being processed.</p>
              </div>
            )}
          </motion.section>
        </div>

        {((course.features && course.features.length > 0) || course.instructor_details?.name) && (
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              {course.instructor_details?.name && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="glass-card p-8 rounded-[2rem] border border-white/10 bg-black/40 shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] -z-10" />
                  <h3 className="font-black tracking-tighter text-2xl mb-8">Lead Instructor</h3>
                  <div className="flex items-center gap-6 mb-6">
                    {course.instructor_details.avatar_url && (
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-primary rounded-full blur-[10px] opacity-50" />
                        <img src={course.instructor_details.avatar_url} alt={course.instructor_details.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary relative z-10" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xl text-white">{course.instructor_details.name}</h4>
                      {course.instructor_details.role && (
                        <p className="text-sm font-bold tracking-widest uppercase text-primary mt-1">{course.instructor_details.role}</p>
                      )}
                    </div>
                  </div>
                  {course.instructor_details.bio && (
                    <p className="text-base text-muted-foreground leading-relaxed font-medium">
                      {course.instructor_details.bio}
                    </p>
                  )}
                </motion.div>
              )}

              {course.features && course.features.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-8 rounded-[2rem] border border-white/10 bg-black/40 shadow-xl"
                >
                  <h3 className="font-black tracking-tighter text-xl mb-6">Course Features</h3>
                  <ul className="space-y-4">
                    {course.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-white/80 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setPreviewLesson(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-primary mb-1 block">Free Preview</span>
                  <h3 className="text-xl font-bold tracking-tight text-white">{previewLesson.title}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPreviewLesson(null)} className="rounded-full hover:bg-white/10 shrink-0">
                  <X className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                <VideoPlayer 
                  provider={previewLesson.video_provider}
                  videoId={previewLesson.video_id}
                  lessonId={previewLesson.id}
                  courseId={course.id}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
