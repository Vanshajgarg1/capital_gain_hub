import React from "react";
import { CmsSection } from "@/types/cms";
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";
import { PremiumCTA } from "@/components/ui/animations/PremiumCTA";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface CmsRendererProps {
  sections: CmsSection[];
}

export function CmsRenderer({ sections }: CmsRendererProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="flex flex-col w-full relative z-10">
      {sections.filter(s => s.is_visible).map((section, index) => (
        <React.Fragment key={section.id}>
          {renderSection(section, index)}
        </React.Fragment>
      ))}
    </div>
  );
}

function renderSection(section: CmsSection, index: number) {
  const { section_type, content } = section;

  switch (section_type) {
    case "hero":
      return (
        <section className="py-40 relative overflow-hidden flex items-center justify-center min-h-[80vh]">
          {content.background_image ? (
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${content.background_image})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-primary/5 z-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 mix-blend-overlay z-10" />
          
          <div className="container mx-auto px-4 md:px-6 relative z-20 text-center max-w-5xl">
            <ScrollReveal>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 tracking-tighter leading-tight">
                {content.headline || "HEADING"}
              </h1>
              {content.subheadline && (
                <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-12 font-medium">
                  {content.subheadline}
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {content.primary_cta_text && content.primary_cta_url && (
                  <Link href={content.primary_cta_url}>
                    <PremiumCTA className="bg-white text-primary hover:bg-white/90 h-14 px-10 text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                      {content.primary_cta_text}
                    </PremiumCTA>
                  </Link>
                )}
                {content.secondary_cta_text && content.secondary_cta_url && (
                  <Link href={content.secondary_cta_url}>
                    <div className="flex items-center justify-center h-14 px-10 rounded-full border border-white/20 text-white font-bold hover:bg-white/10 transition-colors">
                      {content.secondary_cta_text}
                    </div>
                  </Link>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      );

    case "text":
      return (
        <section className="py-24 relative">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <ScrollReveal>
              {content.heading && (
                <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">{content.heading}</h2>
              )}
              <div 
                className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content.body || "" }}
              />
            </ScrollReveal>
          </div>
        </section>
      );

    case "features":
      return (
        <section className="py-24 relative">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal>
              {content.heading && (
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{content.heading}</h2>
                </div>
              )}
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {(content.items || []).map((item: any, i: number) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="glass-card p-8 rounded-2xl h-full border border-white/5 hover:border-primary/30 transition-colors">
                    <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="py-32 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] pointer-events-none z-0" />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center max-w-3xl">
            <ScrollReveal>
              {content.heading && (
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">{content.heading}</h2>
              )}
              {content.description && (
                <p className="text-xl text-muted-foreground mb-10">{content.description}</p>
              )}
              {content.button_text && content.button_url && (
                <Link href={content.button_url}>
                  <PremiumCTA className="h-14 px-10 text-lg">
                    {content.button_text}
                  </PremiumCTA>
                </Link>
              )}
            </ScrollReveal>
          </div>
        </section>
      );

    case "image":
      return (
        <section className="py-24 relative">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            <ScrollReveal>
              <div className="rounded-3xl overflow-hidden border border-white/10 glass-card">
                {content.image_url ? (
                  <img 
                    src={content.image_url} 
                    alt={content.alt_text || "Website Image"} 
                    className="w-full h-auto max-h-[80vh] object-cover"
                  />
                ) : (
                  <div className="w-full h-[60vh] bg-white/5 flex items-center justify-center text-muted-foreground">
                    Image Placeholder
                  </div>
                )}
              </div>
              {content.caption && (
                <p className="text-center text-sm text-muted-foreground mt-4">{content.caption}</p>
              )}
            </ScrollReveal>
          </div>
        </section>
      );

    case "video":
      return (
        <section className="py-24 relative">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <ScrollReveal>
              {content.title && (
                <h2 className="text-3xl font-bold mb-8 text-center">{content.title}</h2>
              )}
              <div className="rounded-3xl overflow-hidden border border-white/10 glass-card aspect-video relative bg-black">
                {content.video_url ? (
                  <iframe 
                    src={content.video_url} 
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    Video Placeholder
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="py-24 relative bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <ScrollReveal>
              {content.heading && (
                <h2 className="text-3xl md:text-5xl font-bold mb-12 text-center">{content.heading}</h2>
              )}
              {content.items && content.items.length > 0 && (
                <Accordion className="w-full space-y-4">
                  {content.items.map((faq: any, i: number) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-white/10 bg-black/40 backdrop-blur-xl px-6 rounded-xl border-b transition-all duration-300">
                      <AccordionTrigger className="text-left font-bold text-lg hover:no-underline py-6 hover:text-primary transition-colors">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-6 leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </ScrollReveal>
          </div>
        </section>
      );

    case "testimonials":
      return (
        <section className="py-24 relative">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollReveal>
              {content.heading && (
                <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">{content.heading}</h2>
              )}
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {(content.items || []).map((t: any, i: number) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="glass-card p-8 rounded-3xl flex flex-col h-full border border-white/5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 group">
                    <p className="text-foreground/90 leading-relaxed mb-8 flex-1 text-lg italic">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-4 mt-auto pt-6 border-t border-white/10">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0 border border-primary/30">
                        {(t.name || "A").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold">{t.name}</h4>
                        {t.role && <p className="text-xs text-primary/80 uppercase tracking-wider font-semibold">{t.role}</p>}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
