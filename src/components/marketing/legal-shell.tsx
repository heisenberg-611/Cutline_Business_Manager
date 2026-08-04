import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Reveal, ScrollProgress } from '@/components/ui/scroll-animation';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { LegalToc } from '@/components/marketing/legal-toc';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Shared frame for /privacy and /terms.
 *
 * Both pages previously rendered as a bare column with no header or footer and
 * without `force-light`, so they inherited the dashboard's dark theme while the
 * homepage stayed light — the same link took you between two different-looking
 * sites. This puts them on the homepage's chrome and palette.
 */
export function LegalShell({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="force-light min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <ScrollProgress />
      {/* No `signedIn` prop: keeps this page statically prerenderable. */}
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border/50 bg-muted/20 py-16 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/3 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[120px]"
          />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back to home
              </Link>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {intro}
              </p>
              <p className="mt-6 inline-flex rounded-full border border-border/60 bg-background px-3 py-1 text-sm text-muted-foreground">
                Last updated: {updated}
              </p>
            </Reveal>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="gap-12 lg:grid lg:grid-cols-[220px_1fr]">
            <LegalToc sections={sections.map((s) => ({ id: s.id, title: s.title }))} />

            <div className="min-w-0 space-y-12">
              {sections.map((section, i) => (
                <Reveal key={section.id} delay={Math.min(i, 4) * 0.04}>
                  <section id={section.id} className="scroll-mt-24">
                    <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      {i + 1}. {section.title}
                    </h2>
                    <div className="space-y-4 leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                      {section.body}
                    </div>
                  </section>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
