import { getPublishedPage } from "@/lib/api/cms";
import { CmsRenderer } from "@/components/public/CmsRenderer";
import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";

export const metadata = {
  title: "Terms of Service | Capital Gain Hub",
  description: "Terms and conditions for Capital Gain Hub.",
};

export const revalidate = 0;

export default async function TermsPage() {
  const cmsPage = await getPublishedPage("terms");
  const hasCmsContent = !!cmsPage && !!cmsPage.sections && cmsPage.sections.length > 0;

  return (
    <div className="flex flex-col min-h-screen pt-24 relative z-0">
      <AnimatedBackground />
      
      {hasCmsContent ? (
        <CmsRenderer sections={cmsPage.sections || []} />
      ) : (
        <section className="py-24 relative">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <ScrollReveal>
              <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Terms of Service</h1>
              <div className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed">
                <p>Welcome to Capital Gain Hub.</p>
                <p>Please read these terms and conditions carefully before using our service.</p>
                <h2>1. Acceptance of Terms</h2>
                <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
                <h2>2. Educational Purposes Only</h2>
                <p>Capital Gain Hub is an educational platform. We do not provide financial, investment, or legal advice. Trading in financial markets involves a high degree of risk, and you may lose more than your initial investment. Past performance is not indicative of future results. All information provided in our courses, videos, and platform is for educational purposes only. You must conduct your own research or consult with a licensed financial advisor before making any investment decisions.</p>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}
    </div>
  );
}
