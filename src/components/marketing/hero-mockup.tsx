import React from 'react';
import { LayoutDashboard, Users, Folder, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';
import { ScaleIn } from '@/components/ui/scroll-animation';

export function HeroMockup() {
  return (
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
  );
}
