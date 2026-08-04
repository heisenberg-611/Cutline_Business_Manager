import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Receipt,
  Shield,
  Sparkles,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import {
  HoverLift,
  Reveal,
  RevealItem,
  RevealStagger,
  ScaleIn,
  ScrollProgress,
} from '@/components/ui/scroll-animation';
import { HeroMockup } from '@/components/marketing/hero-mockup';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { PLAN_PRICES, getPlanFeatures, PLANS } from '@/lib/subscription';
import prisma from '@/modules/core/db/prisma';
import { ContactForm } from '@/components/marketing/ContactForm';
import { CONTACT, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE.name} | ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: SITE.url },
  openGraph: {
    title: `${SITE.name} | ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    images: [
      { url: '/og-image.jpg', width: 1200, height: 630, alt: `${SITE.name} — ${SITE.tagline}` },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

const STEPS = [
  {
    title: 'Onboard the client',
    body: 'Send one secure link that collects the brief, the reference assets and the deposit — no back-and-forth thread to reconstruct later.',
  },
  {
    title: 'Deliver and iterate',
    body: 'Share drafts through the client portal. Feedback arrives pinned to the work it refers to, so nothing gets lost in translation.',
  },
  {
    title: 'Get paid',
    body: 'Approved work turns into a numbered invoice with the project data already filled in. Track what is outstanding at a glance.',
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Do I need a credit card to start?',
    answer:
      'No. The Starter plan is free and does not ask for payment details. You can upgrade later from inside the dashboard once you know the product fits how you work.',
  },
  {
    question: 'What happens to my data if I downgrade?',
    answer:
      'Nothing is deleted. Projects beyond your new plan limit become read-only rather than disappearing, and paid-only features are locked until you upgrade again. Your clients, invoices and files stay exactly where they are.',
  },
  {
    question: 'Can my clients use Cutline OS without an account?',
    answer:
      'Yes. Intake forms, draft review, feedback and the invoice payment portal all work through secure per-client links. Your clients never create a login or see your other projects.',
  },
  {
    question: 'How does team access work?',
    answer:
      'Admins see everything in the workspace. Members are scoped to the projects they have been added to, with owner, collaborator and watcher roles controlling whether they can manage, edit or only read. Team features are part of the Business plan.',
  },
  {
    question: 'Is my client data kept private?',
    answer:
      'Every workspace is isolated: queries are scoped to your business on the server, and realtime channels are authorised per user rather than per organisation, so teammates cannot subscribe to conversations they are not part of.',
  },
  {
    question: 'Can I export what I put in?',
    answer:
      'Yes. Invoices generate as PDFs, and you can request a full export of your workspace data by emailing support at any time.',
  },
];

export default async function MarketingHomepage() {
  const { userId } = await auth();

  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'default' },
  });

  const features = getPlanFeatures(settings || undefined);

  const plans = [
    {
      key: PLANS.FREE,
      name: 'Starter',
      price: PLAN_PRICES.FREE,
      blurb: 'For freelancers finding their footing.',
      cta: { href: '/sign-up', label: 'Get started free' },
      highlighted: false,
    },
    {
      key: PLANS.PRO,
      name: 'Professional',
      price: PLAN_PRICES.PRO,
      blurb: 'For busy creatives running a full client roster.',
      cta: { href: '/claim-trial', label: 'Start 1 month free' },
      highlighted: true,
    },
    {
      key: PLANS.BUSINESS,
      name: 'Business',
      price: PLAN_PRICES.BUSINESS,
      blurb: 'For studios and agencies working as a team.',
      cta: { href: '#contact', label: 'Talk to us' },
      highlighted: false,
    },
  ];

  return (
    <div className="force-light min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <ScrollProgress />
      <SiteHeader signedIn={Boolean(userId)} />

      <main>
        {/* ---------------------------------------------------------------- Hero */}
        <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1920px] items-center px-4 py-16 sm:px-6 lg:px-12 lg:py-0">
          {/* Ambient wash. Sits behind everything and never intercepts pointer events. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-[110px]" />
          </div>

          <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-8">
            <RevealStagger className="max-w-2xl text-left" stagger={0.09}>
              <RevealItem>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Purpose-built for creative studios</span>
                </div>
              </RevealItem>

              <RevealItem>
                <h1 className="mb-6 text-[2.75rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                  Your creative business,
                  <br />
                  <span className="text-muted-foreground">finally organized.</span>
                </h1>
              </RevealItem>

              <RevealItem>
                <p className="mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  Replace the spreadsheet, the invoice template, the feedback thread and the
                  shared drive with one workspace that understands how client work actually
                  flows.
                </p>
              </RevealItem>

              <RevealItem className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href={userId ? '/dashboard' : '/sign-up'}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
                >
                  {userId ? 'Go to dashboard' : 'Start for free'}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-transparent px-8 py-4 text-base font-medium text-foreground transition-colors hover:bg-muted"
                >
                  See how it works
                </Link>
              </RevealItem>

              {/* Concrete, checkable statements rather than an invented user count. */}
              <RevealItem className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {['Free plan, no card required', 'Set up in minutes', 'Cancel anytime'].map(
                  (point) => (
                    <span key={point} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary/70" />
                      {point}
                    </span>
                  )
                )}
              </RevealItem>
            </RevealStagger>

            <HeroMockup />
          </div>
        </section>

        {/* -------------------------------------------------------- How it works */}
        <section id="how-it-works" className="scroll-mt-20 overflow-hidden border-y border-border/50 bg-muted/20 py-24">
          <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12">
            <Reveal className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Three steps, start to paid
              </h2>
              <p className="text-lg text-muted-foreground">
                The same path every project takes — without you holding it together by hand.
              </p>
            </Reveal>

            <RevealStagger
              className="relative grid grid-cols-1 gap-12 md:grid-cols-3"
              stagger={0.12}
            >
              <div
                aria-hidden
                className="absolute left-[16%] right-[16%] top-8 -z-10 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
              />

              {STEPS.map((step, i) => (
                <RevealItem key={step.title} className="flex flex-col items-center text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-primary text-xl font-bold text-primary-foreground shadow-md">
                    {i + 1}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="max-w-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </section>

        {/* ------------------------------------------------------------ Features */}
        <section id="features" className="scroll-mt-20 overflow-hidden py-24">
          <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12">
            <Reveal className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Everything you need to run your creative business
              </h2>
              <p className="text-lg text-muted-foreground">
                Five tools replaced by one workflow, designed specifically for client services.
              </p>
            </Reveal>

            <RevealStagger className="grid grid-cols-1 gap-6 md:grid-cols-3" stagger={0.1}>
              <RevealItem className="md:col-span-2">
                <HoverLift className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-background p-8 shadow-sm transition-shadow hover:shadow-lg md:p-12">
                  <div className="relative z-10 max-w-md">
                    <Users className="mb-6 h-10 w-10 text-primary" />
                    <h3 className="mb-3 text-2xl font-semibold">Client &amp; project pipeline</h3>
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      Every client and project in one trackable board. Know what&apos;s due,
                      what&apos;s in review and what shipped — without opening four folders to
                      find out.
                    </p>
                  </div>
                  <div className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 text-foreground opacity-[0.07] transition-opacity duration-500 group-hover:opacity-[0.14]">
                    <LayoutDashboard className="h-64 w-64" />
                  </div>
                </HoverLift>
              </RevealItem>

              <RevealItem>
                <HoverLift className="group relative h-full overflow-hidden rounded-3xl border border-border/50 bg-background p-8 shadow-sm transition-shadow hover:shadow-lg md:p-10">
                  <div className="relative z-10">
                    <Receipt className="mb-6 h-10 w-10 text-primary" />
                    <h3 className="mb-3 text-xl font-semibold">Invoicing that just works</h3>
                    <p className="leading-relaxed text-muted-foreground">
                      Sequential numbering, no manual chasing. Invoices generate from project
                      data and clients pay through a link.
                    </p>
                  </div>
                  <div className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 text-foreground opacity-[0.05] transition-opacity duration-500 group-hover:opacity-[0.1]">
                    <FileText className="h-48 w-48" />
                  </div>
                </HoverLift>
              </RevealItem>

              <RevealItem>
                <HoverLift className="group relative h-full overflow-hidden rounded-3xl border border-border/50 bg-background p-8 shadow-sm transition-shadow hover:shadow-lg md:p-10">
                  <div className="relative z-10">
                    <MessageSquare className="mb-6 h-10 w-10 text-primary" />
                    <h3 className="mb-3 text-xl font-semibold">Feedback in the workflow</h3>
                    <p className="leading-relaxed text-muted-foreground">
                      Revisions and testimonials land where the work lives. No more decoding
                      vague notes from a long email chain.
                    </p>
                  </div>
                  <div className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 text-foreground opacity-[0.05] transition-opacity duration-500 group-hover:opacity-[0.1]">
                    <MessageSquare className="h-48 w-48" />
                  </div>
                </HoverLift>
              </RevealItem>

              <RevealItem className="md:col-span-2">
                <HoverLift className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-background p-8 shadow-sm transition-shadow hover:shadow-lg md:p-12">
                  <div className="relative z-10 max-w-md">
                    <UsersRound className="mb-6 h-10 w-10 text-primary" />
                    <h3 className="mb-3 text-2xl font-semibold">Built to grow into a team</h3>
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      Add teammates to the projects they work on, assign tasks, discuss in
                      threads and pull someone in with an @mention. Owner, collaborator and
                      watcher roles keep access exactly as wide as it should be.
                    </p>
                  </div>
                  <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 text-foreground opacity-[0.07] transition-opacity duration-500 group-hover:opacity-[0.14]">
                    <Shield className="h-64 w-64" />
                  </div>
                </HoverLift>
              </RevealItem>
            </RevealStagger>
          </div>
        </section>

        {/* ------------------------------------------------------------- Pricing */}
        <section
          id="pricing"
          className="scroll-mt-20 overflow-hidden border-y border-border/50 bg-muted/20 py-24"
        >
          <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12">
            <Reveal className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Start free. Upgrade when the work outgrows the plan, not before.
              </p>
            </Reveal>

            <RevealStagger
              className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-8 md:grid-cols-3 lg:gap-10"
              stagger={0.12}
            >
              {plans.map((plan) => (
                <RevealItem key={plan.name} className="h-full">
                  <HoverLift
                    lift={plan.highlighted ? -6 : -4}
                    className={`relative flex h-full flex-col rounded-3xl p-8 ${
                      plan.highlighted
                        ? 'bg-primary text-primary-foreground shadow-xl md:-translate-y-4'
                        : 'border border-border bg-background shadow-sm'
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-background px-4 py-1 text-xs font-bold text-foreground shadow-sm">
                        MOST POPULAR
                      </div>
                    )}

                    <h3 className="mb-2 text-xl font-semibold">{plan.name}</h3>
                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">৳{plan.price}</span>
                      <span className={plan.highlighted ? 'opacity-80' : 'text-muted-foreground'}>
                        /month
                      </span>
                    </div>
                    <p
                      className={`mb-8 text-sm ${
                        plan.highlighted ? 'opacity-90' : 'text-muted-foreground'
                      }`}
                    >
                      {plan.blurb}
                    </p>

                    <ul className="mb-8 flex-1 space-y-3">
                      {features[plan.key].map((feature) => (
                        <li key={feature.name} className="flex items-start gap-3 text-sm">
                          {feature.included ? (
                            <CheckCircle2
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                plan.highlighted ? 'opacity-90' : 'text-primary'
                              }`}
                            />
                          ) : (
                            <X
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                plan.highlighted ? 'opacity-50' : 'text-muted-foreground'
                              }`}
                            />
                          )}
                          <span
                            className={
                              feature.included
                                ? plan.highlighted
                                  ? ''
                                  : 'text-foreground'
                                : plan.highlighted
                                  ? 'opacity-70'
                                  : 'text-muted-foreground'
                            }
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={plan.cta.href}
                      className={`w-full rounded-xl py-3 text-center font-medium transition-colors ${
                        plan.highlighted
                          ? 'bg-background text-foreground hover:bg-muted'
                          : 'border border-border hover:bg-muted'
                      }`}
                    >
                      {plan.cta.label}
                    </Link>
                  </HoverLift>
                </RevealItem>
              ))}
            </RevealStagger>

            <Reveal delay={0.2} className="mt-10 text-center text-sm text-muted-foreground">
              Prices in Bangladeshi Taka (৳), billed monthly. Plans can be changed or cancelled
              from the dashboard at any time.
            </Reveal>
          </div>
        </section>

        {/* ----------------------------------------------------------------- FAQ */}
        <section id="faq" className="scroll-mt-20 overflow-hidden py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Questions, answered
              </h2>
              <p className="text-lg text-muted-foreground">
                Still unsure about something?{' '}
                <Link href="#contact" className="text-foreground underline underline-offset-4">
                  Ask us directly
                </Link>
                .
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <Faq items={FAQ_ITEMS} />
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------------- About */}
        <section
          id="about"
          className="scroll-mt-20 border-y border-border/50 bg-muted/20 py-24"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl">
                Built by creatives, for creatives.
              </h2>
            </Reveal>
            <RevealStagger className="space-y-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              <RevealItem>
                <p>
                  We know the shape of the chaos: the email chain nobody can find, the feedback
                  that arrived as a voice note, the invoice that slipped a month. Most of it
                  isn&apos;t creative work at all — it&apos;s the admin that grows around it.
                </p>
              </RevealItem>
              <RevealItem>
                <p>
                  Cutline OS replaces the scattered spreadsheets, generic task boards and loose
                  PDFs with one workspace that understands how creative services actually run.
                  The goal is narrow and unglamorous: give you back the hours you currently
                  spend managing the work instead of doing it.
                </p>
              </RevealItem>
            </RevealStagger>
          </div>
        </section>

        {/* ------------------------------------------------------------- Contact */}
        <section id="contact" className="scroll-mt-20 overflow-hidden py-24">
          <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <Reveal direction="right">
                <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
                  Get in touch
                </h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  Questions about pricing, features, or setting up your team? Write to us and a
                  human will reply.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">Email us directly</h3>
                      <a
                        href={`mailto:${CONTACT.support}`}
                        className="break-all transition-colors hover:text-foreground"
                      >
                        {CONTACT.support}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">Support hours</h3>
                      <p>
                        {CONTACT.hours} ({CONTACT.timezone})
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="left" delay={0.1}>
                <ContactForm />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- Final CTA */}
        <section className="mx-auto max-w-[1920px] overflow-hidden px-4 pb-24 sm:px-6 lg:px-12">
          <ScaleIn className="relative rounded-[2.5rem] bg-primary p-12 text-center text-primary-foreground shadow-2xl md:p-20">
            <div
              aria-hidden
              className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-primary-foreground/10 to-transparent"
            />
            <div className="relative z-10">
              <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
                Ready to get organized?
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-lg opacity-90 md:text-xl">
                Set up your workspace in a few minutes and run your next project start to
                finish in one place.
              </p>
              <Link
                href={userId ? '/dashboard' : '/sign-up'}
                className="group inline-flex items-center justify-center rounded-full bg-background px-8 py-4 text-base font-medium text-foreground shadow-lg shadow-background/20 transition-colors hover:bg-muted"
              >
                {userId ? 'Go to dashboard' : 'Start for free'}
                <ArrowUpRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </Link>
            </div>
          </ScaleIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
