"use client";

import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

export const AnimatedCounter = ({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const rounded = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  return (
    <ScrollReveal direction="up" delay={0.2}>
      <div ref={ref} className="text-center p-8 glass-card rounded-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <h3 className="text-5xl md:text-6xl font-black mb-2 fintech-gradient inline-flex">
          <motion.span>{rounded}</motion.span>
          <span>{suffix}</span>
        </h3>
        <p className="text-muted-foreground text-lg uppercase tracking-wider font-semibold">{label}</p>
      </div>
    </ScrollReveal>
  );
};
