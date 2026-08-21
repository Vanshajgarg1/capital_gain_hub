import { HeroSection } from "@/components/public/HeroSection";
import { CourseCard } from "@/components/public/CourseCard";
import { PricingCard } from "@/components/public/PricingCard";
import { MOCK_FAQS, MOCK_TESTIMONIALS } from "@/lib/mock-data";
import { getPublishedCourses } from "@/lib/api/courses";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, BookOpen, Brain, ShieldAlert, Target, TrendingUp, PlayCircle } from "lucide-react";
import { Youtube } from "@/components/ui/social-icons";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
  const courses = await getPublishedCourses();

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />

      {/* Learning Path Section */}
      <section id="learning-path" className="py-24 bg-background relative overflow-hidden border-t border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Your Trading Journey</h2>
            <p className="text-lg text-muted-foreground">
              A structured, step-by-step progression from understanding the basics to mastering advanced institutional concepts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { num: "01", title: "FOUNDATION", desc: "Market structure, order types, and basic mechanics.", icon: <BookOpen className="w-8 h-8 text-primary" /> },
              { num: "02", title: "TECHNICAL ANALYSIS", desc: "Candlesticks, trends, volume, and indicators.", icon: <TrendingUp className="w-8 h-8 text-primary" /> },
              { num: "03", title: "RISK MANAGEMENT", desc: "Position sizing, stop losses, and preserving capital.", icon: <ShieldAlert className="w-8 h-8 text-primary" /> },
              { num: "04", title: "MARKET DYNAMICS", desc: "Supply and demand, liquidity, and market cycles.", icon: <Target className="w-8 h-8 text-primary" /> },
              { num: "05", title: "ADVANCED STRATEGIES", desc: "Options, futures, and smart money concepts.", icon: <Brain className="w-8 h-8 text-primary" /> },
              { num: "06", title: "PROFESSIONAL MINDSET", desc: "Trading psychology and building a consistent edge.", icon: <ArrowRight className="w-8 h-8 text-primary" /> }
            ].map((step, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 font-black text-6xl group-hover:opacity-20 transition-opacity text-primary">
                  {step.num}
                </div>
                <div className="mb-6">{step.icon}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-24 bg-secondary/30 border-t border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your Learning Path</h2>
              <p className="text-lg text-muted-foreground">
                Whether you are just starting out or looking to refine your edge, we have a comprehensive program tailored for you.
              </p>
            </div>
            <Link href="/courses">
              <Button variant="outline" className="hidden md:flex">View All Courses</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.length > 0 ? (
              courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center glass-card rounded-2xl">
                <p className="text-muted-foreground text-lg">New courses are launching soon. Stay tuned!</p>
              </div>
            )}
          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/courses">
              <Button variant="outline" className="w-full">View All Courses</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Invest in Your Education</h2>
            <p className="text-lg text-muted-foreground">
              Simple, transparent pricing. One-time payment for lifetime access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            <PricingCard plan={{
              name: "STARTER",
              description: "For complete beginners",
              price: 49,
              features: ["Trading Foundations Course", "5 Modules", "Lifetime Access", "Community Support"]
            }} />
            <PricingCard plan={{
              name: "ULTIMATE",
              description: "Complete trading education",
              price: 399,
              isPopular: true,
              features: ["All 4 Courses", "Complete Learning Path", "Advanced Strategies", "Priority Support", "1-on-1 Mentoring Session", "Lifetime Updates"]
            }} />
            <PricingCard plan={{
              name: "PRO",
              description: "For serious learners",
              price: 149,
              features: ["Technical Trading Mastery", "10 Modules", "Lifetime Access", "Standard Support", "Quizzes & Exercises"]
            }} />
          </div>
        </div>
      </section>

      {/* YouTube Section */}
      <section id="youtube" className="py-24 bg-secondary/30 border-t border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-500">
                <Youtube className="w-4 h-4 mr-2" />
                Free Education
              </div>
              <h2 className="text-3xl md:text-5xl font-bold">Learn Free. <br/>Go Deeper.</h2>
              <p className="text-lg text-muted-foreground max-w-lg">
                Start your journey with our free YouTube content. When you are ready for a structured, step-by-step professional program, join the Hub.
              </p>
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20">
                <Youtube className="mr-2 h-5 w-5" />
                Visit YouTube Channel
              </Button>
            </div>
            
            <div className="flex-1 w-full max-w-lg">
              <div className="glass-card rounded-2xl p-4 rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="aspect-video bg-muted rounded-xl relative overflow-hidden flex items-center justify-center group cursor-pointer">
                  <img src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="YouTube Thumbnail" />
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                    <PlayCircle className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold">Smart Money Concepts Explained</h4>
                  <p className="text-sm text-muted-foreground">145K views • 2 weeks ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for Serious Learners</h2>
            <p className="text-lg text-muted-foreground">
              Don't just take our word for it. Hear from students who have transformed their trading journey.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {MOCK_TESTIMONIALS.map((testimonial) => (
              <div key={testimonial.id} className="glass-card p-8 rounded-2xl flex flex-col h-full">
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" />
                    </svg>
                  ))}
                </div>
                <p className="text-foreground/90 leading-relaxed mb-8 flex-1">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-4 mt-auto pt-6 border-t border-border/50">
                  <img src={testimonial.avatar_url} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold">{testimonial.name}</h4>
                    <p className="text-xs text-primary">{testimonial.student_type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-secondary/30 border-t border-border/50">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h2>
          </div>
          
          <Accordion defaultValue={["faq-0"]} className="w-full">
            {MOCK_FAQS.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-border/50 mb-4 glass-card px-6 rounded-xl border-b-0">
                <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-primary-foreground mb-6">
            Your Trading Journey Starts Here.
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
            Build your knowledge. Develop your process. Keep learning.
          </p>
          <Link href="/courses">
            <Button size="lg" variant="secondary" className="text-lg h-14 px-10 rounded-full font-bold shadow-2xl">
              Explore Courses
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
