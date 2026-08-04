"use client";

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Sticky table of contents that tracks the section currently in view.
 *
 * Uses IntersectionObserver rather than scroll maths so it stays accurate when
 * sections have wildly different heights, which legal copy always does.
 */
export function LegalToc({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = React.useState(sections[0]?.id);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Top-weighted band: a heading counts as "current" once it reaches the
      // upper third of the viewport, not when it merely enters it.
      { rootMargin: '-80px 0px -66% 0px', threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-24">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        <ul className="space-y-1 border-l border-border">
          {sections.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id} className="relative">
                {isActive && (
                  <motion.span
                    layoutId="legal-toc-active"
                    className="absolute -left-px top-0 h-full w-px bg-foreground"
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  />
                )}
                <a
                  href={`#${section.id}`}
                  className={`block py-1.5 pl-4 text-sm transition-colors ${
                    isActive
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {section.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
