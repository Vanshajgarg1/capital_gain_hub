"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  width?: "fit-content" | "100%";
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  staggerChildren?: boolean;
}

export const ScrollReveal = ({
  children,
  width = "100%",
  className = "",
  delay = 0,
  direction = "up",
  staggerChildren = false,
}: ScrollRevealProps) => {
  const getVariants = () => {
    if (staggerChildren) {
      return {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: delay,
          },
        },
      };
    }

    const y = direction === "up" ? 40 : direction === "down" ? -40 : 0;
    const x = direction === "left" ? 40 : direction === "right" ? -40 : 0;

    return {
      hidden: { opacity: 0, y, x },
      visible: {
        opacity: 1,
        y: 0,
        x: 0,
        transition: {
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
          delay,
        },
      },
    };
  };

  return (
    <motion.div
      variants={getVariants()}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }}
      style={{ width }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
