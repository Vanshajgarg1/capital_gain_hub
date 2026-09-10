"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumCTAProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const PremiumCTA = ({ children, className, onClick }: PremiumCTAProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative overflow-hidden group rounded-full font-bold shadow-2xl transition-all",
        "bg-primary text-primary-foreground hover:shadow-primary/50 hover:bg-primary/90 flex items-center justify-center cursor-pointer",
        className
      )}
    >
      <span className="relative z-10 flex items-center justify-center">
        {children}
      </span>
      {/* Light sweep effect on hover */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
    </motion.div>
  );
};
