import { supabase } from "@/lib/supabase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Animation Wrappers
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";
import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { PremiumCTA } from "@/components/ui/animations/PremiumCTA";

export const revalidate = 0;

export default async function FAQPage() {
  const { data: faqsData, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  const faqs = faqsData || [];

  return (
    <div className="flex flex-col min-h-screen pt-24 relative z-0">
      <AnimatedBackground />

      <div className="container mx-auto px-4 md:px-6 max-w-4xl pb-32 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-20 mt-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-8 border border-primary/20 shadow-[0_0_30px_rgba(23,163,74,0.15)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent animate-pulse" />
              <HelpCircle className="w-10 h-10 text-primary relative z-10" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Frequently Asked Questions</h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium">
              Everything you need to know about Capital Gain Hub, our courses, and your trading journey.
            </p>
          </div>
        </ScrollReveal>

        {error ? (
          <ScrollReveal direction="up">
            <div className="text-center p-8 glass-card rounded-2xl text-destructive border-destructive/20 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
              <p className="font-bold text-lg">Failed to load FAQs. Please try again later.</p>
            </div>
          </ScrollReveal>
        ) : faqs.length === 0 ? (
          <ScrollReveal direction="up">
            <div className="text-center p-16 glass-card rounded-3xl text-muted-foreground">
              <p className="text-xl font-medium">No FAQs available yet.</p>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal delay={0.2} direction="up">
            <div className="w-full">
              <Accordion defaultValue={faqs.length > 0 ? [faqs[0].id] : undefined} className="w-full space-y-4">
                {faqs.map((faq) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={faq.id} 
                    className="border border-white/10 bg-black/40 backdrop-blur-xl px-8 rounded-2xl border-b transition-all duration-300 data-[state=open]:border-primary/30 data-[state=open]:shadow-[0_0_30px_rgba(23,163,74,0.1)] group"
                  >
                    <AccordionTrigger className="text-left font-bold text-xl hover:no-underline py-8 hover:text-primary transition-colors">
                      <div className="flex flex-col gap-3">
                        <span className="leading-tight">{faq.question}</span>
                        {faq.category && (
                          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-full w-fit border border-primary/20 group-hover:border-primary/40 transition-colors">
                            {faq.category}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-8 leading-relaxed whitespace-pre-wrap text-lg">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal delay={0.4} direction="up">
          <div className="mt-24 text-center glass-card rounded-3xl p-10 md:p-16 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 mix-blend-overlay" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-3xl font-extrabold mb-4">Still have questions?</h3>
              <p className="text-xl text-muted-foreground mb-10 max-w-lg">
                We are here to help. Ask a question and our support team will get back to you as soon as possible.
              </p>
              <Link href="/dashboard/support">
                <PremiumCTA className="h-14 px-10 text-lg shadow-[0_0_30px_rgba(23,163,74,0.2)] mb-4">
                  Ask a Question
                </PremiumCTA>
              </Link>
              <p className="text-sm text-muted-foreground">
                Or email us directly at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=capitalgainhub113@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">support@capitalgainhub.com</a>
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
