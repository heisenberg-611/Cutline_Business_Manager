import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Users, FileText, MessageSquare, UsersRound, ArrowUpRight, CheckCircle2, LayoutDashboard, Sparkles, Zap, Shield, Folder, Mail, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cutline | Your creative business, finally organized',
  description: 'Clients, projects, invoicing, and feedback — all in one place. Built for photographers, designers, video editors, and creative studios.',
  openGraph: {
    title: 'Cutline | Your creative business, finally organized',
    description: 'Clients, projects, invoicing, and feedback — all in one place. Built for creative professionals.',
    url: 'https://cutline.app',
    siteName: 'Cutline',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Cutline - Your creative business, finally organized' }],
    locale: 'en_US',
    type: 'website',
  },
};

export default async function MarketingHomepage() {
  const { userId } = await auth();
  
  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:w-1/3">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <Link href="/" className="text-lg font-semibold tracking-tight">Cutline</Link>
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
        {/* Hero Section - Split Layout for Desktop to fix unused space */}
        <section className="relative pt-12 pb-16 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="text-left max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-muted text-muted-foreground text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-border/50">
                <Zap className="w-3.5 h-3.5 text-primary" /> Built for creative professionals
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-semibold leading-[1.1] tracking-tight mb-6 text-foreground">
                Your creative business, <br className="hidden lg:block"/> <span className="text-muted-foreground">finally organized</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg">
                Clients, projects, invoicing, and feedback — all in one beautiful workspace. Stop chasing emails and start creating.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-up" className="inline-flex justify-center items-center bg-primary text-primary-foreground border-none rounded-xl px-8 py-4 text-base font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
                  Start free <ArrowUpRight className="w-4 h-4 ml-2" />
                </Link>
                <Link href="#how-it-works" className="inline-flex justify-center items-center bg-transparent border border-border rounded-xl px-8 py-4 text-base font-medium text-foreground hover:bg-muted transition-colors">
                  See how it works
                </Link>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-6 font-medium">
                Built for photographers, designers, video editors, and studios.
              </p>
            </div>

            {/* Right Content - Abstract UI Mockup to fill space */}
            <div className="relative hidden lg:block w-full h-[500px] lg:h-[600px] rounded-2xl bg-muted/30 border border-border/50 shadow-2xl overflow-hidden p-6 group">
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
            </div>
            
          </div>
        </section>

        {/* Feature Bento Grid (Uses space much more efficiently) */}
        <section id="features" className="py-20 bg-muted/20 border-y border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Everything you need to run your creative business</h2>
              <p className="text-lg text-muted-foreground">Replace five different tools with one seamless workflow designed specifically for client services.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Large Feature 1 */}
              <div className="md:col-span-2 bg-background border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10 max-w-md">
                  <Users className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-2xl font-semibold mb-3">Client & project pipeline</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    Every client and project in one clean, trackable view. Know exactly what's due, what's in review, and what's completed without digging through folders.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4 translate-y-1/4">
                  <LayoutDashboard className="w-64 h-64" />
                </div>
              </div>

              {/* Small Feature 1 */}
              <div className="bg-background border border-border/50 rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow">
                <FileText className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-semibold mb-3">Invoicing that just works</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sequential, organized, no manual number chasing. Generate professional invoices directly from your project data.
                </p>
              </div>

              {/* Small Feature 2 */}
              <div className="bg-background border border-border/50 rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow">
                <MessageSquare className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-xl font-semibold mb-3">Feedback in the workflow</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Client revisions and testimonials, right where the work lives. No more deciphering vague email feedback.
                </p>
              </div>

              {/* Large Feature 2 */}
              <div className="md:col-span-2 bg-background border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden group">
                <div className="relative z-10 max-w-md">
                  <UsersRound className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-2xl font-semibold mb-3">Room to grow</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    Roles, assignment, and messaging for when you build a team. Cutline scales gracefully from solo freelancer to a bustling studio.
                  </p>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4">
                  <Shield className="w-64 h-64" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works - Horizontal Flow */}
        <section id="how-it-works" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-semibold mb-16 tracking-tight text-center">How Cutline works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-border -z-10"></div>
              
              <div className="bg-background">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-2xl font-bold border border-border shadow-sm mx-auto mb-8 text-primary">1</div>
                <div className="text-center px-4">
                  <h3 className="text-xl font-semibold mb-3">Add your clients</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Bring your existing clients and projects into one dashboard. Setup takes less than five minutes.
                  </p>
                </div>
              </div>
              
              <div className="bg-background">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-2xl font-bold border border-border shadow-sm mx-auto mb-8 text-primary">2</div>
                <div className="text-center px-4">
                  <h3 className="text-xl font-semibold mb-3">Track the work</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Move projects through your pipeline, share assets, and collect structured feedback from clients.
                  </p>
                </div>
              </div>
              
              <div className="bg-background">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-2xl font-bold border border-border shadow-sm mx-auto mb-8 text-primary">3</div>
                <div className="text-center px-4">
                  <h3 className="text-xl font-semibold mb-3">Get paid</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Send invoices directly from completed projects and keep every payment in view.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEW: Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/20 border-y border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-muted-foreground">Start for free, upgrade when you need more power.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              
              {/* Starter */}
              <div className="bg-background rounded-3xl p-8 border border-border shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <p className="text-muted-foreground text-sm mb-6">Perfect for freelancers just starting out.</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Up to 3 active clients</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Basic project tracking</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Standard invoicing</li>
                </ul>
                <Link href="/sign-up" className="w-full text-center bg-muted text-foreground border border-border/50 rounded-xl px-6 py-3 text-sm font-medium hover:bg-muted/80 transition-colors">
                  Get Started
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-background rounded-3xl p-8 border-2 border-primary shadow-xl flex flex-col relative transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <p className="text-muted-foreground text-sm mb-6">For established creative professionals.</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$15</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Unlimited clients & projects</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Custom branding</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Advanced client feedback</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Priority support</li>
                </ul>
                <Link href="/sign-up" className="w-full text-center bg-primary text-primary-foreground border-none rounded-xl px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors">
                  Start 14-day free trial
                </Link>
              </div>

              {/* Studio */}
              <div className="bg-background rounded-3xl p-8 border border-border shadow-sm flex flex-col">
                <h3 className="text-xl font-semibold mb-2">Studio</h3>
                <p className="text-muted-foreground text-sm mb-6">For growing creative teams and agencies.</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Everything in Professional</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Up to 5 team members</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Role-based permissions</li>
                  <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-primary" /> Studio analytics dashboard</li>
                </ul>
                <Link href="/sign-up" className="w-full text-center bg-muted text-foreground border border-border/50 rounded-xl px-6 py-3 text-sm font-medium hover:bg-muted/80 transition-colors">
                  Get Started
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* NEW: About Section */}
        <section id="about" className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8">Built by creatives, for creatives.</h2>
            <div className="prose prose-lg dark:prose-invert mx-auto text-muted-foreground">
              <p className="mb-6 text-xl leading-relaxed">
                We understand the chaos of managing a creative business. The endless email chains, the lost feedback, the late invoices, and the overwhelming feeling that you're spending more time managing the work than actually creating it.
              </p>
              <p className="text-xl leading-relaxed">
                We built Cutline to replace the scattered mess of spreadsheets, generic task managers, and PDFs with a single, elegant workspace that understands how creative services actually work. Our mission is simple: let you focus on what you do best—creating.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-foreground/10 to-transparent"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">Ready to get organized?</h2>
              <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
                Join thousands of creative professionals who have streamlined their business with Cutline. Start free, no card required.
              </p>
              <Link href="/sign-up" className="inline-flex items-center bg-background text-foreground border-none rounded-xl px-10 py-4 text-lg font-medium hover:bg-background/90 transition-all shadow-lg hover:scale-105">
                Start free <ArrowUpRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer / Contact Section */}
      <footer id="contact" className="border-t border-border/50 pt-16 pb-8 mt-12 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground tracking-tight">Cutline</span>
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
            <p>© {new Date().getFullYear()} Cutline. All rights reserved.</p>
            <p className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Support active Mon-Fri, 9am - 5pm EST</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
