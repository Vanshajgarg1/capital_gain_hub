import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";

export const metadata = {
  title: "Refund Policy | Capital Gain Hub",
  description: "Refund Policy for Capital Gain Hub.",
};

export default function RefundPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 relative z-0">
      <AnimatedBackground />
      
      <section className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Refund Policy</h1>
            <div className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed">
              <p>Thank you for purchasing our educational courses at Capital Gain Hub.</p>
              
              <h2>Digital Goods and Course Access</h2>
              <p>Because our courses are delivered digitally and grant immediate access to proprietary educational content, all sales are considered final once access to the course material is granted.</p>

              <h2>Exceptions</h2>
              <p>Refunds may be considered on a case-by-case basis under the following exceptional circumstances:</p>
              <ul>
                <li>The course content is fundamentally different from its description.</li>
                <li>There are significant, unresolvable technical issues preventing you from accessing the purchased content.</li>
                <li>Fraudulent transactions or unauthorized payments.</li>
              </ul>

              <h2>Review Process</h2>
              <p>If you believe you qualify for a refund under the exceptions listed above, please contact our support team. We will review your request and may ask for additional details or evidence to process your claim.</p>

              <h2>Contact Us</h2>
              <p>For any questions or concerns regarding our Refund Policy, or to request a refund under exceptional circumstances, please contact us at: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=capitalgainhub113@gmail.com" target="_blank" rel="noopener noreferrer">support@capitalgainhub.com</a></p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
