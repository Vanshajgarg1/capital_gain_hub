import Link from "next/link";
import { TrendingUp, Mail } from "lucide-react";
import { Youtube, Instagram, Linkedin } from "@/components/ui/social-icons";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/50 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="bg-primary/10 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-tight">
                CAPITAL GAIN <span className="text-primary">HUB</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Master trading through a structured, practical learning journey. Build your edge in the financial markets with professional education.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Navigation</h3>
            <ul className="space-y-3">
              {["Courses", "Learning Path", "About", "YouTube", "FAQ"].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(" ", "-")}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
            <ul className="space-y-3">
              {["Privacy Policy", "Terms of Service", "Refund Policy", "Disclaimer"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@capitalgainhub.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  support@capitalgainhub.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-border/50 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground/70 max-w-2xl leading-relaxed">
            <strong className="text-muted-foreground">Disclaimer:</strong> Capital Gain Hub provides educational content only. Nothing on this website should be considered financial, investment, or legal advice. Trading involves substantial risk of loss and is not suitable for everyone.
          </p>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            &copy; {new Date().getFullYear()} Capital Gain Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
