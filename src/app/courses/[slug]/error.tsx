"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center pt-32 pb-32">
      <div className="text-center glass-card p-12 rounded-3xl max-w-lg border border-red-500/10 bg-red-500/5">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-3xl font-bold text-red-500 mb-4">Temporarily Unavailable</h1>
        <p className="text-muted-foreground text-lg mb-8">
          We couldn't load this course right now. Our team has been notified and is working on it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} variant="default" className="rounded-full">
            Try Again
          </Button>
          <Link href="/courses" className={buttonVariants({ variant: "outline", className: "rounded-full" })}>
            View All Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
