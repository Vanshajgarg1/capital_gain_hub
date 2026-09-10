import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";

export const metadata = {
  title: "Trading & Financial Disclaimer | Capital Gain Hub",
  description: "Disclaimer for Capital Gain Hub.",
};

export default function DisclaimerPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 relative z-0">
      <AnimatedBackground />
      
      <section className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Trading & Financial Disclaimer</h1>
            <div className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed">
              <h2>Educational Content Only</h2>
              <p>Capital Gain Hub and all of its associated content, courses, videos, materials, and community interactions are provided solely for educational and informational purposes. Nothing contained on our platform should be considered as financial, investment, legal, tax, or trading advice.</p>

              <h2>Risk Warning</h2>
              <p>Trading and investing in financial markets (including but not limited to stocks, forex, crypto, futures, and options) involves a high degree of risk. You may lose some or all of your initial investment. Therefore, you should not speculate with capital that you cannot afford to lose.</p>
              
              <h2>No Guarantees of Profit</h2>
              <p>Past performance of any trading system, methodology, or trader is not necessarily indicative of future results. Capital Gain Hub makes no representations or warranties that any student or user will or is likely to achieve profits or losses similar to those discussed in our educational materials.</p>

              <h2>Personal Responsibility</h2>
              <p>You acknowledge and agree that you are solely responsible for your own trading decisions and investments. Capital Gain Hub, its instructors, founders, and affiliates accept no liability whatsoever for any direct or consequential loss arising from the use of our educational materials.</p>
              <p>Always conduct your own due diligence and consult with a licensed financial professional before making any financial decisions.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
