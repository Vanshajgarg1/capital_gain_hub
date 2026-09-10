"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03]" />
      
      {/* Animated Blobs */}
      <motion.div
        animate={{
          x: [0, 100, -100, 0],
          y: [0, 50, -50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]"
      />
      
      <motion.div
        animate={{
          x: [0, -150, 100, 0],
          y: [0, -100, 50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-[150px]"
      />
    </div>
  );
};
