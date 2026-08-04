"use client";

import React from 'react';
import { motion, useReducedMotion, useScroll, useSpring, type Variants } from 'framer-motion';

/**
 * Mirrors `--ease-out-smooth` in globals.css so JS-driven motion and CSS
 * transitions decelerate identically. Previously the two used different curves.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

function offsetFor(direction: Direction, distance: number) {
  switch (direction) {
    case 'up':
      return { y: distance };
    case 'down':
      return { y: -distance };
    case 'left':
      return { x: distance };
    case 'right':
      return { x: -distance };
    case 'none':
      return {};
  }
}

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  distance?: number;
  /** Softens the entrance. Disabled on large surfaces where it costs paint time. */
  blur?: boolean;
  duration?: number;
}

/**
 * Every primitive here collapses to a plain opacity fade — or to nothing at all —
 * when the visitor has asked for reduced motion. Transform and blur are the parts
 * that trigger vestibular discomfort, so those are what get dropped.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 24,
  blur = true,
  duration = 0.7,
}: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={
        reduce
          ? { opacity: 0 }
          : { opacity: 0, ...offsetFor(direction, distance), filter: blur ? 'blur(6px)' : 'none' }
      }
      whileInView={
        reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }
      }
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduce ? 0.3 : duration, delay: reduce ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface RevealStaggerProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}

export function RevealStagger({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: RevealStaggerProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : delay,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface RevealItemProps {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  distance?: number;
}

export function RevealItem({
  children,
  className,
  direction = 'up',
  distance = 24,
}: RevealItemProps) {
  const reduce = useReducedMotion();

  const variants: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
      }
    : {
        hidden: { opacity: 0, ...offsetFor(direction, distance), filter: 'blur(6px)' },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.7, ease: EASE },
        },
      };

  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduce ? 0.3 : 0.9, delay: reduce ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Spring-based hover lift for cards. A spring rather than a duration so that
 * moving the pointer away mid-animation reverses smoothly from wherever it got to,
 * instead of snapping back to the start of a timed curve.
 */
export function HoverLift({
  children,
  className,
  lift = -4,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: lift }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Thin reading-progress bar pinned under the header. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-primary/70"
    />
  );
}
