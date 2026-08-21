import Link from "next/link";
import { TrendingUp, Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Register | Capital Gain Hub",
  description: "Create your account.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-20 bg-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute bottom-1/4 -right-1/4 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute top-0 left-0 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

      <Card className="w-full max-w-md glass-card border-primary/20 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <Link href="/" className="flex justify-center mb-2">
            <div className="bg-primary/10 p-3 rounded-xl">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </Link>
          <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Join Capital Gain Hub to start your trading journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="name" type="text" placeholder="John Doe" className="pl-10 h-12 bg-background/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@example.com" className="pl-10 h-12 bg-background/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-12 bg-background/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="confirm-password" type="password" placeholder="••••••••" className="pl-10 h-12 bg-background/50" />
              </div>
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <input type="checkbox" id="terms" className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4 mt-1" />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground cursor-pointer leading-relaxed">
                I agree to the <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
              </Label>
            </div>

            <Link href="/dashboard" className="block w-full pt-4">
              <Button className="w-full h-12 text-md shadow-lg shadow-primary/20">
                Create Account
              </Button>
            </Link>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-12 bg-background/50">
            <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
            </svg>
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-center gap-2 pb-8">
          <div className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
