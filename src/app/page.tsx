import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Users, FileText, MessageSquare, UsersRound, ArrowUpRight, CheckCircle2, LayoutDashboard, Sparkles, Zap, Shield, Folder, Mail, Clock } from 'lucide-react';
import { FadeIn, FadeInStagger, FadeInStaggerItem, ScaleIn } from '@/components/ui/scroll-animation';

export const metadata: Metadata = {
  title: 'Cutline OS | Your creative business, finally organized',
  description: 'Manage clients, track projects, send invoices, and collect feedback—all in one beautiful workspace.',
  openGraph: {
    title: 'Cutline OS | Your creative business, finally organized',
    description: 'Replace five different tools with one seamless workflow.',
    url: 'https://cutline.app',
    siteName: 'Cutline OS',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Cutline OS - Your creative business, finally organized' }],
    locale: 'en_US',
    type: 'website',
  },
};

export default async function MarketingHomepage() {
  const { userId } = await auth();
  
  return (
    <div className="force-light min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:w-1/3">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src="/icon.svg" alt="Cutline OS Logo" className="w-full h-full object-contain" />
            </div>
            <Link href="/" className="text-lg font-semibold tracking-tight">Cutline OS</Link>
          </div>
          
          <nav className="hidden md:flex items-center justify-center gap-8 text-sm font-medium text-muted-foreground lg:w-1/3">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#about" className="hover:text-foreground transition-colors">About</Link>
          </nav>
          
          <div className="flex items-center justify-end gap-3 lg:w-1/3">
            {userId ? (
              <Link href="/dashboard" className="bg-primary text-primary-foreground border-none rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="bg-transparent border-none text-sm font-medium text-foreground hover:text-muted-foreground transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link href="/sign-up" className="bg-primary text-primary-foreground border-none rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section - Full Viewport Height */}
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto py-12 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left Content */}
            <FadeInStagger className="text-left max-w-2xl">
              <FadeInStaggerItem>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span>The new standard for creative workflows</span>
                </div>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem>
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
                  Your creative business, <br/><span className="text-muted-foreground">finally organized.</span>
                </h1>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem>
                <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
                  Replace five different tools with one seamless workflow. Manage clients, track projects, send invoices, and collect feedback—all in one beautiful workspace.
                </p>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem className="flex flex-col sm:flex-row items-start gap-4">
                <Link href={userId ? "/dashboard" : "/login"} className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full px-8 py-4 text-base font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 w-full sm:w-auto">
                  {userId ? "Go to Dashboard" : "Start for free"}
                </Link>
                <Link href="#features" className="inline-flex items-center justify-center bg-transparent border border-border rounded-full px-8 py-4 text-base font-medium text-foreground hover:bg-muted transition-colors w-full sm:w-auto">
                  See how it works
                </Link>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-zinc-300 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-zinc-400 border-2 border-background"></div>
                </div>
                <p>Trusted by 2,000+ creative professionals</p>
              </FadeInStaggerItem>
            </FadeInStagger>

            {/* Right Content - Abstract UI Mockup to fill space */}
            <ScaleIn className="relative hidden lg:block w-full h-[500px] xl:h-[650px] rounded-2xl bg-muted/30 border border-border/50 shadow-2xl overflow-hidden p-6 xl:p-8 group" delay={0.2}>
              {/* Fake App Window */}
              <div className="w-full h-full bg-background rounded-xl border border-border/50 shadow-sm flex flex-col overflow-hidden relative z-10 transition-transform group-hover:scale-[1.02] duration-500">
                <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/20">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <div className="flex flex-1 p-4 gap-4">
                  {/* Fake Sidebar */}
                  <div className="w-48 hidden xl:flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-[13px] font-medium text-foreground"><LayoutDashboard className="w-4 h-4"/> Dashboard</div>
                    <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground"><Users className="w-4 h-4"/> Clients</div>
                    <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground"><Folder className="w-4 h-4"/> Projects</div>
                    <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground"><FileText className="w-4 h-4"/> Invoices</div>
                    <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground"><MessageSquare className="w-4 h-4"/> Feedback</div>
                  </div>
                  {/* Fake Main Content */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-3 border-b border-border/40">
                      <div>
                         <div className="text-sm font-semibold text-foreground">ACME Rebranding</div>
                         <div className="text-[11px] text-muted-foreground mt-0.5">Due in 3 days</div>
                      </div>
                      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] px-2.5 py-1 rounded-full font-medium">In Review</div>
                    </div>
                    {/* Fake Kanban / Pipeline */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-24 rounded-lg bg-muted/30 border border-border/50 p-2.5 flex flex-col gap-2">
                         <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">To Do</div>
                         <div className="bg-background rounded p-2 border border-border/50 shadow-sm"><div className="w-3/4 h-1.5 bg-muted-foreground/30 rounded-full mb-1.5"></div><div className="w-1/2 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                      </div>
                      <div className="h-24 rounded-lg bg-muted/30 border border-border/50 p-2.5 flex flex-col gap-2">
                         <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Review</div>
                         <div className="bg-background rounded p-2 border border-border/50 shadow-sm border-l-2 border-l-amber-500"><div className="w-full h-1.5 bg-amber-500/30 rounded-full mb-1.5"></div><div className="w-2/3 h-1.5 bg-amber-500/30 rounded-full"></div></div>
                      </div>
                      <div className="h-24 rounded-lg bg-muted/30 border border-border/50 p-2.5 flex flex-col gap-2">
                         <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Done</div>
                         <div className="bg-background rounded p-2 border border-border/50 shadow-sm opacity-60"><div className="w-4/5 h-1.5 bg-muted-foreground/30 rounded-full"></div></div>
                      </div>
                    </div>
                    {/* Fake Feedback / Invoice section */}
                    <div className="flex-1 rounded-lg bg-muted/10 border border-border/50 p-3 flex gap-3">
                       {/* Feedback thread */}
                       <div className="flex-1 flex flex-col gap-2">
                          <div className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5"/> Client Feedback</div>
                          <div className="bg-background p-2.5 rounded-lg border border-border/50 shadow-sm">
                             <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">JD</div>
                                <div className="text-[11px] font-semibold">Jane (Client)</div>
                             </div>
                             <div className="text-[11px] text-muted-foreground leading-relaxed">Love the new logo concept! Can we try it in the dark blue from the brand guidelines?</div>
                          </div>
                       </div>
                       {/* Quick Invoice */}
                       <div className="w-[120px] bg-background rounded-lg border border-border/50 p-3 flex flex-col justify-between shadow-sm">
                          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Invoice #042</div>
                          <div>
                            <div className="text-xl font-bold tracking-tight text-foreground">$1,200</div>
                            <div className="text-[10px] text-muted-foreground">Due Oct 15</div>
                          </div>
                          <div className="w-full bg-green-500/10 text-green-600 border border-green-500/20 text-center text-[10px] py-1 rounded mt-2 font-medium">Paid in full</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Floating Elements (Moved inside to prevent overflow clipping) */}
              <div className="absolute right-8 top-16 bg-background border border-border p-4 rounded-xl shadow-xl flex items-center gap-4 rotate-3 animate-pulse z-20">
                 <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-500"/></div>
                 <div>
                   <div className="text-sm font-semibold">Invoice Paid</div>
                   <div className="text-xs text-muted-foreground">$2,400.00 from ACME Corp</div>
                 </div>
              </div>
              <div className="absolute left-8 bottom-16 bg-background border border-border p-4 rounded-xl shadow-xl flex items-center gap-3 -rotate-2 z-20">
                 <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Users className="w-4 h-4 text-primary"/></div>
                 <div className="text-sm font-medium">New feedback added</div>
              </div>
            </ScaleIn>
            
          </div>
        </section>

        {/* Feature Bento Grid (Uses space much more efficiently) */}
        <section id="features" className="py-24 bg-muted/20 border-y border-border/50 overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
            <FadeIn className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Everything you need to run your creative business</h2>
              <p className="text-lg text-muted-foreground">Replace five different tools with one seamless workflow designed specifically for client services.</p>
            </FadeIn>
            
            <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Feature 1 */}
              <FadeInStaggerItem className="md:col-span-2 bg-background border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10 max-w-md">
                  <Users className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-2xl font-semibold mb-3">Client & project pipeline</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    Every client and project in one clean, trackable view. Know exactly what's due, what's in review, and what's completed without digging through folders.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4 translate-y-1/4 text-foreground">
                  <LayoutDashboard className="w-64 h-64" />
                </div>
              </FadeInStaggerItem>

              {/* Small Feature 1 */}
              <FadeInStaggerItem className="bg-background border border-border/50 rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
                <div className="relative z-10">
                  <FileText className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-xl font-semibold mb-3">Invoicing that just works</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Sequential, organized, no manual number chasing. Generate professional invoices directly from your project data.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity translate-x-1/4 translate-y-1/4 text-foreground">
                  <FileText className="w-48 h-48" />
                </div>
              </FadeInStaggerItem>

              {/* Small Feature 2 */}
              <FadeInStaggerItem className="bg-background border border-border/50 rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
                <div className="relative z-10">
                  <MessageSquare className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-xl font-semibold mb-3">Feedback in the workflow</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Client revisions and testimonials, right where the work lives. No more deciphering vague email feedback.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity translate-x-1/4 translate-y-1/4 text-foreground">
                  <MessageSquare className="w-48 h-48" />
                </div>
              </FadeInStaggerItem>

              {/* Large Feature 2 */}
              <FadeInStaggerItem className="md:col-span-2 bg-background border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
                <div className="relative z-10 max-w-md">
                  <UsersRound className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-2xl font-semibold mb-3">Room to grow</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    Roles, assignment, and messaging for when you build a team. Cutline OS scales gracefully from solo freelancer to a bustling studio.
                  </p>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4 text-foreground">
                  <Shield className="w-64 h-64" />
                </div>
              </FadeInStaggerItem>
            </FadeInStagger>
          </div>
        </section>

        {/* How it works - Horizontal Flow */}
        <section id="how-it-works" className="py-24 overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-semibold mb-16 tracking-tight text-center">How Cutline OS works</h2>
            </FadeIn>
            
            <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting line (Desktop only) */}
              <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-border -z-10"></div>
              
              <FadeInStaggerItem className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-background border-4 border-background shadow-md flex items-center justify-center text-xl font-bold bg-muted mb-6">1</div>
                <h3 className="text-xl font-semibold mb-2">Onboard Client</h3>
                <p className="text-muted-foreground">Send a secure link to your client to collect their brief, assets, and initial deposit in one seamless flow.</p>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-background border-4 border-background shadow-md flex items-center justify-center text-xl font-bold bg-muted mb-6">2</div>
                <h3 className="text-xl font-semibold mb-2">Deliver & Iterate</h3>
                <p className="text-muted-foreground">Share drafts through the portal. Clients can pinpoint exactly what they want changed with visual annotations.</p>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-background border-4 border-background shadow-md flex items-center justify-center text-xl font-bold bg-primary text-primary-foreground mb-6">3</div>
                <h3 className="text-xl font-semibold mb-2">Get Paid</h3>
                <p className="text-muted-foreground">Once approved, the final invoice is automatically generated. Assets are unlocked only after payment is received.</p>
              </FadeInStaggerItem>
            </FadeInStagger>
          </div>
        </section>

        {/* NEW: Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/20 border-y border-border/50 overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
            <FadeIn className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-muted-foreground">Start for free, upgrade when you need more power.</p>
            </FadeIn>
            
            <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
              
              {/* Starter */}
              <FadeInStaggerItem className="bg-background rounded-3xl p-8 border border-border shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <div className="mb-6"><span className="text-4xl font-bold">$0</span><span className="text-muted-foreground">/month</span></div>
                <p className="text-muted-foreground text-sm mb-8">Perfect for freelancers just starting out.</p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Up to 3 active projects</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Basic invoicing</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Standard client portal</li>
                </ul>
                <Link href="/login" className="w-full py-3 rounded-xl border border-border text-center font-medium hover:bg-muted transition-colors">Get Started</Link>
              </FadeInStaggerItem>

              {/* Professional (Highlighted) */}
              <FadeInStaggerItem className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-xl flex flex-col relative transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-foreground text-xs font-bold px-4 py-1 rounded-full border border-border shadow-sm">
                  MOST POPULAR
                </div>
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <div className="mb-6"><span className="text-4xl font-bold">$29</span><span className="opacity-80">/month</span></div>
                <p className="opacity-90 text-sm mb-8">For busy creatives who need serious tools.</p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 opacity-90" /> Unlimited active projects</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 opacity-90" /> Advanced workflow & pipelines</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 opacity-90" /> Custom branded client portals</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 opacity-90" /> In-context feedback tools</li>
                </ul>
                <Link href="/login" className="w-full py-3 rounded-xl bg-background text-foreground text-center font-medium hover:bg-muted transition-colors">Start Free Trial</Link>
              </FadeInStaggerItem>

              {/* Studio */}
              <FadeInStaggerItem className="bg-background rounded-3xl p-8 border border-border shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Studio</h3>
                <div className="mb-6"><span className="text-4xl font-bold">$99</span><span className="text-muted-foreground">/month</span></div>
                <p className="text-muted-foreground text-sm mb-8">For growing teams and agencies.</p>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Everything in Pro</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Up to 5 team members</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Granular permissions</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Priority support</li>
                </ul>
                <Link href="/contact" className="w-full py-3 rounded-xl border border-border text-center font-medium hover:bg-muted transition-colors">Contact Sales</Link>
              </FadeInStaggerItem>

            </FadeInStagger>
          </div>
        </section>

        {/* NEW: About Section */}
        <section id="about" className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8">Built by creatives, for creatives.</h2>
            <div className="prose prose-lg mx-auto text-muted-foreground">
              <p className="mb-6 text-xl leading-relaxed">
                We understand the chaos of managing a creative business. The endless email chains, the lost feedback, the late invoices, and the overwhelming feeling that you're spending more time managing the work than actually creating it.
              </p>
              <p className="text-xl leading-relaxed">
                We built Cutline OS to replace the scattered mess of spreadsheets, generic task managers, and PDFs with a single, elegant workspace that understands how creative services actually work. Our mission is simple: let you focus on what you do best—creating.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto overflow-hidden">
          <ScaleIn className="bg-primary text-primary-foreground rounded-[2.5rem] p-12 md:p-20 text-center relative shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-foreground/10 to-transparent rounded-[2.5rem]"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to get organized?</h2>
              <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">Join thousands of creative professionals who use Cutline OS to run their business smoothly and profitably.</p>
              <Link href={userId ? "/dashboard" : "/login"} className="inline-flex items-center justify-center bg-background text-foreground rounded-full px-8 py-4 text-base font-medium hover:bg-muted transition-colors shadow-lg shadow-background/20 group">
                {userId ? "Go to Dashboard" : "Start your free trial"}
                <ArrowUpRight className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
          </ScaleIn>
        </section>
      </main>

      {/* Footer / Contact Section */}
      <footer id="contact" className="border-t border-border/50 pt-16 pb-8 mt-12 bg-muted/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 flex items-center justify-center">
                  <img src="/icon.svg" alt="Cutline OS Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-lg font-semibold text-foreground tracking-tight">Cutline OS</span>
              </div>
              <p className="text-muted-foreground max-w-sm leading-relaxed text-sm">
                Your creative business, finally organized. Clients, projects, invoicing, and feedback — all in one beautiful workspace.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:support@cutline.app" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                    <Mail className="w-4 h-4" /> support@cutline.app
                  </a>
                </li>
                <li>
                  <a href="mailto:sales@cutline.app" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                    <MessageSquare className="w-4 h-4" /> sales@cutline.app
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Cutline OS. All rights reserved.</p>
            <p className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Support active Mon-Fri, 9am - 5pm EST</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
