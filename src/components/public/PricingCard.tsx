import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface PricingPlan {
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular?: boolean;
}

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <Card className={`relative flex flex-col ${plan.isPopular ? 'border-primary ring-1 ring-primary shadow-2xl shadow-primary/20 scale-105 z-10' : 'border-border/50 bg-background/50'}`}>
      {plan.isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-lg">
            Most Popular
          </span>
        </div>
      )}
      
      <CardHeader className="text-center pb-2">
        <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
        <p className="text-muted-foreground text-sm h-10">{plan.description}</p>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="text-center mb-8">
          <span className="text-5xl font-extrabold">₹{plan.price.toLocaleString("en-IN")}</span>
          <span className="text-muted-foreground"> / lifetime</span>
        </div>
        
        <ul className="space-y-4">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Link href="/login" className="w-full">
          <Button 
            className={`w-full font-semibold ${plan.isPopular ? 'shadow-lg shadow-primary/25' : ''}`} 
            variant={plan.isPopular ? "default" : "outline"}
            size="lg"
          >
            Enroll Now
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
