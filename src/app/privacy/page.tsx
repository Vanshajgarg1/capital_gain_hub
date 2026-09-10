import { AnimatedBackground } from "@/components/ui/animations/AnimatedBackground";
import { ScrollReveal } from "@/components/ui/animations/ScrollReveal";

export const metadata = {
  title: "Privacy Policy | Capital Gain Hub",
  description: "Privacy Policy for Capital Gain Hub.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 relative z-0">
      <AnimatedBackground />
      
      <section className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">Privacy Policy</h1>
            <div className="prose prose-invert prose-lg max-w-none text-muted-foreground leading-relaxed">
              <p>Welcome to Capital Gain Hub. We respect your privacy and are committed to protecting your personal data.</p>
              
              <h2>1. Information We Collect</h2>
              <p>We may collect and process the following data about you:</p>
              <ul>
                <li><strong>Account Information:</strong> Name, email address, and authentication data provided during registration.</li>
                <li><strong>Payment Information:</strong> We do not store full credit card details. Payment processing is handled securely by our third-party payment providers (e.g., Razorpay/Stripe).</li>
                <li><strong>Course Progress:</strong> Data related to your progression, completion of lessons, and interaction with the platform.</li>
                <li><strong>Cookies & Session Data:</strong> Information to keep you logged in and understand how you navigate our platform to improve user experience.</li>
              </ul>

              <h2>2. Use of Information</h2>
              <p>We use your data to:</p>
              <ul>
                <li>Provide, maintain, and improve our educational services.</li>
                <li>Process transactions and send related information, including confirmations and receipts.</li>
                <li>Send technical notices, updates, security alerts, and administrative messages.</li>
                <li>Respond to your comments, questions, and customer service requests.</li>
              </ul>

              <h2>3. Data Security</h2>
              <p>We implement appropriate technical and organizational measures to maintain the safety of your personal information. However, please remember that no method of transmission over the internet or electronic storage is 100% secure.</p>

              <h2>4. Third-Party Services</h2>
              <p>We may share your data with trusted third-party service providers (e.g., payment processors, video hosting providers like Mux or YouTube, and database hosting providers) solely for the purpose of operating our platform.</p>

              <h2>5. Your Rights</h2>
              <p>You have the right to access, update, or delete your personal information. If you wish to exercise these rights, please contact us.</p>

              <h2>6. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=capitalgainhub113@gmail.com" target="_blank" rel="noopener noreferrer">support@capitalgainhub.com</a></p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
