import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Youtube } from "@/components/ui/social-icons";
import { ArrowRight, BookOpen, Target, ShieldAlert, TrendingUp, Brain, GraduationCap } from "lucide-react";
import Link from "next/link";
import { getPublishedPage } from "@/lib/api/cms";
import { CmsRenderer } from "@/components/public/CmsRenderer";

// Animation Wrappers
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";
import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { PremiumCTA } from "@/components/ui/animations/PremiumCTA";

export const metadata = {
  title: "About | Capital Gain Hub",
  description: "Learn about Capital Gain Hub's mission to provide structured, practical trading education.",
};

export const revalidate = 0;

export default async function AboutPage() {
  const cmsPage = await getPublishedPage("about");
  const hasCmsContent = !!cmsPage && !!cmsPage.sections && cmsPage.sections.length > 0;

  return (
    <div className="flex flex-col min-h-screen pt-24 relative z-0">
      <AnimatedBackground />
      
      {hasCmsContent ? (
        <CmsRenderer sections={cmsPage.sections || []} />
      ) : (
        <>
          {/* Hero Section */}
          <section className="relative overflow-hidden py-20 lg:py-32">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <ScrollReveal>
                  <div className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-semibold text-primary mb-8 shadow-[0_0_15px_rgba(23,163,74,0.15)]">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    About Capital Gain Hub
                  </div>
                  <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter leading-tight">
                    Master the Markets with <br className="hidden md:block" />
                    <span className="fintech-gradient glow-text">Structured Education</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-10 font-medium">
                    Capital Gain Hub was founded on a simple premise: trading education should be structured, practical, and accessible. We bridge the gap between basic retail concepts and advanced institutional strategies.
                  </p>
                </ScrollReveal>
              </div>
            </div>
          </section>

      {/* Mission & Philosophy */}
      <section className="py-32 bg-secondary/30 relative">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="right">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tight">Our Mission</h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                The financial markets are complex, and the internet is flooded with noise, get-rich-quick schemes, and fragmented information. Our mission is to cut through the noise by providing a clear, step-by-step learning journey.
              </p>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Whether you are a complete beginner looking to understand market mechanics or an experienced trader seeking to refine your edge with smart money concepts, our curriculum is designed to evolve with you.
              </p>
            </ScrollReveal>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: "Practical First", desc: "No pure theory. Everything taught is applicable in live markets.", icon: <Target className="w-8 h-8 text-primary" /> },
                { title: "Risk Focused", desc: "Capital preservation is prioritized above all else.", icon: <ShieldAlert className="w-8 h-8 text-primary" /> },
                { title: "Structured", desc: "A logical progression from A to Z.", icon: <BookOpen className="w-8 h-8 text-primary" /> },
                { title: "Psychology", desc: "Building the mindset required for consistency.", icon: <Brain className="w-8 h-8 text-primary" /> },
              ].map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.15} direction="up">
                  <div className="glass-card p-8 rounded-3xl hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 group">
                    <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                      <div className="group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                    </div>
                    <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 md:px-6">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Why Capital Gain Hub?</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                We focus on the underlying mechanics of the market, teaching you how to read price action independently rather than relying on indicators.
              </p>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <ScrollReveal direction="up" delay={0}>
              <div className="glass-card p-10 rounded-3xl text-center flex flex-col items-center group hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 h-full">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(23,163,74,0.15)] group-hover:shadow-[0_0_50px_rgba(23,163,74,0.3)]">
                  <TrendingUp className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Beginner to Advanced</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Start with absolute basics and progress through technical analysis, liquidity concepts, and advanced market structure.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <div className="glass-card p-10 rounded-3xl text-center flex flex-col items-center group hover:border-cyan-400/50 transition-all duration-500 hover:-translate-y-2 h-full">
                <div className="w-20 h-20 bg-cyan-400/10 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(34,211,238,0.15)] group-hover:shadow-[0_0_50px_rgba(34,211,238,0.3)]">
                  <Brain className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Institutional Edge</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Move beyond retail patterns. Learn how to track smart money, understand liquidity pools, and trade alongside the trend.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.4}>
              <div className="glass-card p-10 rounded-3xl text-center flex flex-col items-center group hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 h-full">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                  <BookOpen className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Lifetime Access</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Your education doesn't expire. Pay once, retain access forever, and benefit from all future updates to your enrolled courses.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Cinematic CTA Section */}
      <section className="py-40 relative overflow-hidden flex items-center justify-center min-h-[60vh]">
        <div className="absolute inset-0 bg-primary z-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 mix-blend-overlay z-10" />
        
        {/* Animated glowing orbs in CTA */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-[100px] z-10 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-[100px] z-10 animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="container mx-auto px-4 md:px-6 relative z-20 text-center max-w-4xl">
          <ScrollReveal>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
              Ready to Build Your Edge?
            </h2>
            <p className="text-2xl text-white/80 max-w-2xl mx-auto mb-12 font-medium">
              Choose a course to begin your structured education, or check out our free content on YouTube.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/courses">
                <PremiumCTA className="bg-white text-primary hover:bg-white/90 h-16 px-12 text-xl shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                  Explore Courses
                </PremiumCTA>
              </Link>
              <Link href="/#youtube" className={cn("inline-flex items-center justify-center h-16 px-12 text-xl rounded-full font-bold bg-black/50 backdrop-blur-md text-white hover:bg-black/80 border border-white/20 shadow-2xl transition-all hover:scale-105", buttonVariants({ size: "lg" }))}>
                  <Youtube className="ml-2 w-6 h-6 mr-3" />
                  Visit YouTube
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
      
        </>
      )}
      
      {/* Disclaimer */}
      <section className="py-16 bg-background relative z-20">
        <div className="container mx-auto px-4 md:px-6">
          <ScrollReveal direction="up">
            <div className="glass-card p-8 rounded-3xl max-w-5xl mx-auto border-dashed border-white/10 hover:border-white/20 transition-colors">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="p-4 bg-muted/50 rounded-2xl shrink-0">
                  <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-3">Educational Disclaimer</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Capital Gain Hub is an educational platform. We do not provide financial, investment, or legal advice. Trading in financial markets involves a high degree of risk, and you may lose more than your initial investment. Past performance is not indicative of future results. All information provided in our courses, videos, and platform is for educational purposes only. You must conduct your own research or consult with a licensed financial advisor before making any investment decisions.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
