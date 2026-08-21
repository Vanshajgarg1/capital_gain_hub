import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Content */}
          <div className="flex flex-col space-y-8 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary w-fit">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Join 10,000+ Active Learners
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
              Master Trading. <br/>
              <span className="fintech-gradient glow-text">Build Your Edge.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Learn trading from the fundamentals to advanced strategies through a structured, practical learning journey. Stop guessing, start executing.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/courses">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-xl shadow-primary/25 group">
                  Explore Courses
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#youtube">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 border-border/50 hover:bg-background/80">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch on YouTube
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t border-border/50">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">10K+</span>
                <span className="text-sm text-muted-foreground">Students</span>
              </div>
              <div className="w-px h-12 bg-border/50"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">100+</span>
                <span className="text-sm text-muted-foreground">Lessons</span>
              </div>
              <div className="w-px h-12 bg-border/50"></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Beginner → Advanced</span>
                <span className="text-sm text-muted-foreground">Structured Path</span>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative hidden lg:block h-[600px] w-full">
            {/* Premium Abstract Financial Visual */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-[400px] glass-card rounded-2xl p-6 shadow-2xl flex items-end gap-2 overflow-hidden border-t-white/20">
                {/* Abstract Candlesticks */}
                {[...Array(12)].map((_, i) => {
                  const isGreen = Math.random() > 0.4;
                  const height = Math.random() * 60 + 20;
                  const offset = Math.random() * 40;
                  return (
                    <div 
                      key={i} 
                      className="flex-1 flex flex-col items-center justify-end relative h-full animate-in fade-in slide-in-from-bottom"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div 
                        className={`w-px h-full absolute top-0 ${isGreen ? 'bg-primary/50' : 'bg-destructive/50'}`}
                        style={{ height: `${height + offset + 20}%` }}
                      ></div>
                      <div 
                        className={`w-full rounded-sm z-10 shadow-lg ${isGreen ? 'bg-primary shadow-primary/40' : 'bg-destructive shadow-destructive/40'}`} 
                        style={{ height: `${height}%`, marginBottom: `${offset}%` }}
                      ></div>
                    </div>
                  );
                })}
                
                {/* Overlay lines and grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                
                {/* Overlay overlay gradients */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/90 to-transparent"></div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
