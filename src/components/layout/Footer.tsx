import Link from "next/link";
import { TrendingUp, Mail } from "lucide-react";
import { Youtube, Instagram } from "@/components/ui/social-icons";

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10 relative overflow-hidden">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none z-0" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 pr-0 md:pr-12">
            <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
              <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(23,163,74,0.15)] group-hover:shadow-[0_0_25px_rgba(23,163,74,0.3)] border border-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="font-extrabold text-2xl tracking-tighter text-white">
                CAPITAL GAIN <span className="text-primary glow-text">HUB</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Master trading through a structured, practical learning journey. Build your edge in the financial markets with premium professional education.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="https://www.instagram.com/capital.gain.hub?stkn=b2ZhOXo0b2dxdmYw&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-primary hover:scale-110 transition-all border border-white/10">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://youtube.com/@CAPITALGAINHUB-l7v" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-primary hover:scale-110 transition-all border border-white/10">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="md:col-span-2">
            <h3 className="font-bold mb-6 text-white text-lg tracking-wide uppercase">Navigation</h3>
            <ul className="space-y-4">
              {[
                { name: "Courses", href: "/courses" },
                { name: "Learning Path", href: "/#learning-path" },
                { name: "About", href: "/about" },
                { name: "YouTube", href: "/#youtube" },
                { name: "FAQ", href: "/faq" },
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors font-medium">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h3 className="font-bold mb-6 text-white text-lg tracking-wide uppercase">Legal</h3>
            <ul className="space-y-4">
              {[
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Terms of Service", href: "/terms" },
                { name: "Refund Policy", href: "/refund-policy" },
                { name: "Disclaimer", href: "/disclaimer" }
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors font-medium">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h3 className="font-bold mb-6 text-white text-lg tracking-wide uppercase">Contact</h3>
            <ul className="space-y-4">
              <li>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=capitalgainhub113@gmail.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors font-medium group">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-4 w-4 group-hover:text-primary" />
                  </div>
                  support@capitalgainhub.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground/60 max-w-4xl text-center leading-relaxed">
            <strong className="text-muted-foreground/80 font-semibold">Disclaimer:</strong> Capital Gain Hub provides educational content only. Nothing on this website should be considered financial, investment, or legal advice. Trading involves substantial risk of loss and is not suitable for everyone.
          </p>
          <p className="text-sm text-muted-foreground/80 whitespace-nowrap font-medium">
            &copy; {new Date().getFullYear()} Capital Gain Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
