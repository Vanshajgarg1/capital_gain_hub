"use client";

import { motion } from "framer-motion";

export const BrandMarquee = () => {
  const items = [
    "CAPITAL GAIN HUB",
    "•",
    "STRUCTURED LEARNING",
    "•",
    "PRACTICAL TRADING",
    "•",
    "RISK MANAGEMENT",
    "•",
    "ADVANCED STRATEGIES",
    "•",
    "BUILD YOUR EDGE",
    "•",
  ];

  return (
    <div className="w-full overflow-hidden bg-primary/10 border-y border-primary/20 py-4 flex items-center relative z-20">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
      
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div className="flex gap-8 px-4 text-primary text-sm tracking-widest font-bold">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
