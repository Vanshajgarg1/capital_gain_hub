import { HeroSection } from "@/components/public/HeroSection";
import { YoutubeSection } from "@/components/public/youtube-section";
import { CourseCard } from "@/components/public/CourseCard";
import { PricingCard } from "@/components/public/PricingCard";
import { getPublishedCourses } from "@/lib/api/courses";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import { Button, buttonVariants } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, BookOpen, Brain, ShieldAlert, Target, TrendingUp, PlayCircle } from "lucide-react";
import { Youtube } from "@/components/ui/social-icons";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Animation Wrappers
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";
import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { BrandMarquee } from "@/components/ui/animations/BrandMarquee";
import { PremiumCTA } from "@/components/ui/animations/PremiumCTA";

import { getPublishedPage } from "@/lib/api/cms";
import { CmsRenderer } from "@/components/public/CmsRenderer";

export const revalidate = 0;

export default async function Home() {
  const [courses, { data: testimonialsData }, { data: faqsData }, cmsPage, studentData, lessonData] = await Promise.all([
    getPublishedCourses(),
    supabase
      .from("testimonials")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("faqs")
      .select("*")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false }),
    getPublishedPage("home"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "STUDENT"),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  const studentCount = studentData?.count || 0;
  const lessonCount = lessonData?.count || 0;

  const testimonials = testimonialsData || [];
  const faqs = faqsData || [];

  const hasCourseError = courses === null;
  const publishedCourses = courses ?? [];
  
  // If CMS page exists, we use its sections for the top of the page.
  const hasCmsContent = !!cmsPage && !!cmsPage.sections && cmsPage.sections.length > 0;

  return (
    <div className="flex flex-col min-h-screen relative z-0">
      <AnimatedBackground />
      
      {hasCmsContent ? (
        <CmsRenderer sections={cmsPage.sections || []} />
      ) : (
        <>
          <HeroSection studentCount={studentCount} lessonCount={lessonCount} />
          <BrandMarquee />
        </>
      )}

      {/* Learning Path Section */}
      <section id="learning-path" className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Your Trading Journey</h2>
              <p className="text-xl text-muted-foreground">
                A structured, step-by-step progression from understanding the basics to mastering advanced institutional concepts.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { num: "01", title: "FOUNDATION", desc: "Market structure, order types, and basic mechanics.", icon: <BookOpen className="w-8 h-8 text-primary" /> },
              { num: "02", title: "TECHNICAL ANALYSIS", desc: "Candlesticks, trends, volume, and indicators.", icon: <TrendingUp className="w-8 h-8 text-primary" /> },
              { num: "03", title: "RISK MANAGEMENT", desc: "Position sizing, stop losses, and preserving capital.", icon: <ShieldAlert className="w-8 h-8 text-primary" /> },
              { num: "04", title: "MARKET DYNAMICS", desc: "Supply and demand, liquidity, and market cycles.", icon: <Target className="w-8 h-8 text-primary" /> },
              { num: "05", title: "ADVANCED STRATEGIES", desc: "Options, futures, and smart money concepts.", icon: <Brain className="w-8 h-8 text-primary" /> },
              { num: "06", title: "PROFESSIONAL MINDSET", desc: "Trading psychology and building a consistent edge.", icon: <ArrowRight className="w-8 h-8 text-primary" /> }
            ].map((step, i) => (
              <ScrollReveal key={i} delay={i * 0.1} direction="up">
                <div className="glass-card p-8 rounded-2xl relative overflow-hidden group hover:border-primary/50 transition-colors duration-500 hover:-translate-y-2 transform">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-0 right-0 p-6 opacity-10 font-black text-6xl group-hover:opacity-20 group-hover:scale-110 transition-all text-primary duration-500">
                    {step.num}
                  </div>
                  <div className="mb-6 relative z-10 group-hover:scale-110 transition-transform origin-left">{step.icon}</div>
                  <h3 className="text-xl font-bold mb-3 relative z-10">{step.title}</h3>
                  <p className="text-muted-foreground relative z-10">{step.desc}</p>
                  
                  {/* Connective Line for Timeline effect */}
                  {i < 5 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-primary/20 z-0" />
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-32 relative">
        <div className="absolute inset-0 bg-secondary/50 backdrop-blur-3xl z-[-1]" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <ScrollReveal direction="up">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-muted-foreground w-fit mb-4">
                  Curriculum
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Choose Your Edge</h2>
                <p className="text-xl text-muted-foreground">
                  Whether you are just starting out or looking to refine your edge, we have a comprehensive program tailored for you.
                </p>
              </div>
              <Link href="/courses" className={cn("hidden md:flex items-center justify-center rounded-full px-8 h-12 border border-primary/20 bg-background hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium", buttonVariants({ variant: "outline" }))}>
                  View All Courses
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses === null ? (
              <ScrollReveal className="col-span-full">
                <div className="py-16 text-center glass-card rounded-2xl border border-red-500/10 bg-red-500/5">
                  <p className="text-red-500 text-xl font-medium mb-2">Courses temporarily unavailable</p>
                  <p className="text-muted-foreground">Please try again later. Our team has been notified.</p>
                </div>
              </ScrollReveal>
            ) : courses.length > 0 ? (
              courses.map((course, i) => (
                <ScrollReveal key={course.id} delay={i * 0.1}>
                  <div className="h-full transition-transform duration-500 hover:-translate-y-2">
                    <CourseCard course={course} />
                  </div>
                </ScrollReveal>
              ))
            ) : (
              <ScrollReveal className="col-span-full">
                <div className="py-16 text-center glass-card rounded-2xl">
                  <p className="text-muted-foreground text-xl">New premium programs are launching soon.</p>
                </div>
              </ScrollReveal>
            )}
          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/courses" className={cn("flex w-full items-center justify-center rounded-full h-10 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors", buttonVariants({ variant: "outline" }))}>
              View All Courses
            </Link>
          </div>
        </div>
      </section>

      <BrandMarquee />

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative">
        <div className="container mx-auto px-4 md:px-6">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Invest in Your Process</h2>
              <p className="text-xl text-muted-foreground">
                Simple, transparent pricing. One-time payment for lifetime access to the ecosystem.
              </p>
            </div>
          </ScrollReveal>

          {hasCourseError ? (
            <ScrollReveal>
              <div className="py-20 text-center glass-card rounded-3xl border border-red-500/10 bg-red-500/5 max-w-3xl mx-auto">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-2xl font-bold text-red-500 mb-2">Temporarily Unavailable</h3>
                <p className="text-muted-foreground text-lg">Courses are temporarily unavailable. Please try again later.</p>
              </div>
            </ScrollReveal>
          ) : publishedCourses.length > 0 ? (
            <div className={cn(
              "grid grid-cols-1 gap-8 max-w-6xl mx-auto items-center",
              publishedCourses.length === 1 ? "md:grid-cols-1 max-w-md" :
              publishedCourses.length === 2 ? "md:grid-cols-2 max-w-4xl" :
              "md:grid-cols-3"
            )}>
              {publishedCourses.map((course, i) => (
                <ScrollReveal key={course.id} delay={i * 0.2} direction="up">
                  <div className="relative group h-full">
                    <PricingCard course={course} isFeatured={i === 0 && !publishedCourses.some(c => c.is_featured)} />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <ScrollReveal>
              <div className="py-20 text-center glass-card rounded-3xl border border-white/5 max-w-3xl mx-auto">
                <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                <h3 className="text-2xl font-bold text-white mb-2">Programs Updating</h3>
                <p className="text-muted-foreground text-lg">Our premium curriculum is currently being updated for the next cohort. Check back soon.</p>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* YouTube Section */}
      <YoutubeSection />

      {/* Testimonials */}
      {testimonials.length > 0 ? (
        <section className="py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-20">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-muted-foreground w-fit mb-4">
                  Success Stories
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Built for Serious Learners</h2>
                <p className="text-xl text-muted-foreground">
                  Don't just take our word for it. Hear from students who have transformed their trading process.
                </p>
              </div>
            </ScrollReveal>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {testimonials.map((testimonial, i) => (
                <ScrollReveal key={testimonial.id} delay={i * 0.1}>
                  <div className="glass-card p-8 rounded-3xl flex flex-col h-full hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 group">
                    <div className="flex gap-1 mb-8">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-primary fill-current group-hover:scale-110 transition-transform origin-bottom" style={{ transitionDelay: `${i * 50}ms` }} viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-foreground/90 leading-relaxed mb-8 flex-1 text-lg italic">
                      "{testimonial.review_text}"
                    </p>
                    <div className="flex items-center gap-4 mt-auto pt-6 border-t border-white/10">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0 border border-primary/30">
                        {testimonial.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold">{testimonial.student_name}</h4>
                        <p className="text-xs text-primary/80 uppercase tracking-wider font-semibold">Student</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {faqs.length > 0 ? (
        <section id="faq" className="py-32 relative bg-secondary/30">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />
          <div className="container mx-auto px-4 md:px-6 max-w-4xl relative z-10">
            <ScrollReveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Frequently Asked Questions</h2>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.2}>
              <Accordion defaultValue={[faqs[0].id]} className="w-full space-y-4">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id} className="border border-white/10 bg-black/40 backdrop-blur-xl px-8 rounded-2xl border-b transition-all duration-300 data-[state=open]:border-primary/30 data-[state=open]:shadow-[0_0_30px_rgba(23,163,74,0.1)]">
                    <AccordionTrigger className="text-left font-bold text-xl hover:no-underline py-8 hover:text-primary transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-8 leading-relaxed text-lg whitespace-pre-wrap">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3}>
              <div className="mt-12 text-center">
                <Link 
                  href="/faq" 
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-full px-8 h-12 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors text-lg"
                  )}
                >
                  View all FAQs <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      ) : null}

      {/* Cinematic Final CTA */}
      {!hasCmsContent && (
        <section className="py-40 relative overflow-hidden flex items-center justify-center min-h-[70vh]">
          <div className="absolute inset-0 bg-primary z-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 mix-blend-overlay z-10" />
          
          {/* Animated glowing orbs in CTA */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[100px] z-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-[100px] z-10 animate-pulse" style={{ animationDelay: "1s" }} />

          <div className="container mx-auto px-4 md:px-6 relative z-20 text-center max-w-4xl">
            <ScrollReveal>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-none">
                STOP GUESSING.<br/>START LEARNING.
              </h2>
              <p className="text-2xl text-white/80 max-w-2xl mx-auto mb-12 font-medium">
                From market basics to advanced strategies. Build a process. Build confidence. Build your edge.
              </p>
              <Link href="/courses">
                <PremiumCTA className="bg-white text-primary hover:bg-white/90 h-16 px-12 text-xl shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                  Start Your Journey
                </PremiumCTA>
              </Link>
            </ScrollReveal>
          </div>
        </section>
      )}
    </div>
  );
}
