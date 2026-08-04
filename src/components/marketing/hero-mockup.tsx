"use client";

import React from 'react';
import { LayoutDashboard, Users, Folder, FileText, MessageSquare, CheckCircle2, ArrowUpRight, ArrowRight, BarChart3, Clock, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export function HeroMockup() {
   const reduce = useReducedMotion();

   /**
    * Entrance is carried by opacity/scale so the idle float can own `y` outright.
    * Animating y from an entrance offset into a keyframe loop makes the card snap
    * to the first keyframe instead of easing into it.
    */
   const float = (delay: number, distance: number) =>
      reduce
         ? {}
         : {
              y: [0, -distance, 0],
              transition: {
                 y: { delay, duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
              },
           };

   return (
      <motion.div
         initial={{ opacity: 0, y: 40 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.2 }}
         className="relative hidden lg:block w-full h-[550px] xl:h-[650px] rounded-2xl bg-gradient-to-br from-muted/50 to-muted/10 border border-border/50 shadow-2xl overflow-hidden p-5 xl:p-8 group"
      >
         {/* Background glow effects */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
         <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-teal-500/10 blur-[80px] rounded-full pointer-events-none" />

         {/* Fake App Window */}
         <div className="w-full h-full bg-background/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-lg flex flex-col overflow-hidden relative z-10 transition-transform group-hover:scale-[1.01] duration-700 ease-out">
            <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/20">
               <div className="w-3 h-3 rounded-full bg-red-400"></div>
               <div className="w-3 h-3 rounded-full bg-amber-400"></div>
               <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>

            <div className="flex flex-1 p-4 xl:p-5 gap-4 xl:gap-6">
               {/* Fake Sidebar */}
               <div className="w-48 hidden 2xl:flex flex-col gap-1.5 border-r border-border/40 pr-4">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-[13px] font-medium text-primary-foreground shadow-sm">
                     <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"><Users className="w-4 h-4" /> Clients</div>
                  <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"><Folder className="w-4 h-4" /> Projects</div>
                  <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"><FileText className="w-4 h-4" /> Invoices</div>
                  <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"><MessageSquare className="w-4 h-4" /> Feedback</div>

                  <div className="mt-auto bg-muted/50 p-4 rounded-lg border border-border/50">
                     <div className="text-[11px] text-muted-foreground mb-2 font-medium">Monthly Goal</div>
                     <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                        <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: '78%' }}
                           transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                           className="h-full bg-indigo-500 rounded-full"
                        />
                     </div>
                     <div className="text-[10px] text-foreground font-semibold mt-1 text-right">78%</div>
                  </div>
               </div>

               {/* Fake Main Content */}
               <div className="flex-1 flex flex-col gap-4 xl:gap-6 pt-1 overflow-hidden">
                  {/* Header row */}
                  <div className="flex justify-between items-end">
                     <div>
                        <motion.h2 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-bold tracking-tight text-foreground">Overview</motion.h2>
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="text-[13px] text-muted-foreground mt-1">Here's what's happening with your business today.</motion.div>
                     </div>
                     <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="flex gap-2">
                        <div className="bg-background border border-border shadow-sm text-foreground text-[12px] px-3 py-1.5 rounded-md font-medium flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Last 30 Days
                        </div>
                     </motion.div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-3 gap-4">
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-background border border-border/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
                        <div className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Total Revenue</div>
                        <div className="text-2xl font-bold text-foreground">৳124,500</div>
                        <div className="text-[10px] font-medium text-green-600 mt-1 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" /> +14% from last month</div>
                     </motion.div>

                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-background border border-border/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
                        <div className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><Folder className="w-3.5 h-3.5" /> Active Projects</div>
                        <div className="text-2xl font-bold text-foreground">8</div>
                        <div className="text-[10px] font-medium text-amber-600 mt-1 flex items-center gap-0.5">3 approaching deadline</div>
                     </motion.div>

                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-background border border-border/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-bl-full pointer-events-none" />
                        <div className="text-[12px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Outstanding Invoices</div>
                        <div className="text-2xl font-bold text-foreground">৳86,000</div>
                        <div className="text-[10px] font-medium text-muted-foreground mt-1 flex items-center gap-0.5">Awaiting 2 clients</div>
                     </motion.div>
                  </div>

                  {/* Main bottom section: Active Project & Activity */}
                  <div className="flex-1 flex gap-4 h-full min-h-0">
                     {/* Project Board (Professional Kanban View) */}
                     <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="flex-[2] bg-background border border-border/50 rounded-xl shadow-sm flex flex-col overflow-hidden">
                        <div className="border-b border-border/50 p-3.5 bg-muted/20 flex justify-between items-center">
                           <span className="text-[13px] font-semibold text-foreground flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Active Sprint: Studio Rebrand</span>
                           <div className="flex -space-x-1.5">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground border-2 border-background z-20">YOU</div>
                              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-700 border-2 border-background z-10">SW</div>
                           </div>
                        </div>
                        <div className="p-4 flex-1 flex gap-4 overflow-hidden bg-muted/10">
                           {/* Column 1: In Progress */}
                           <div className="flex-1 flex flex-col gap-2.5">
                              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                                 In Progress <span className="bg-background border border-border/50 px-1.5 py-0.5 rounded text-[10px] text-foreground">2</span>
                              </div>
                              <div className="flex flex-col gap-2.5 overflow-hidden">
                                 <div className="bg-background border border-border/50 p-3 rounded-lg shadow-sm transition-colors hover:border-border cursor-pointer min-w-0">
                                    <div className="text-[12px] font-semibold text-foreground mb-1 truncate">Finalize Logo Assets</div>
                                    <div className="text-[10px] text-muted-foreground mb-3 leading-relaxed truncate">Export SVG and PNG variants for client handoff.</div>
                                    <div className="flex justify-between items-center">
                                       <span className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[9px] px-2 py-0.5 rounded font-medium">Design</span>
                                       <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground">YOU</div>
                                    </div>
                                 </div>
                                 <div className="bg-background border border-border/50 p-3 rounded-lg shadow-sm transition-colors hover:border-border cursor-pointer opacity-60 min-w-0">
                                    <div className="text-[12px] font-semibold text-foreground mb-1 truncate">Update Brand Colors</div>
                                    <div className="flex justify-between items-center mt-2">
                                       <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] px-2 py-0.5 rounded font-medium">Revisions</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           {/* Column 2: In Review */}
                           <div className="flex-1 flex flex-col gap-2.5">
                              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                                 In Review <span className="bg-background border border-border/50 px-1.5 py-0.5 rounded text-[10px] text-foreground">1</span>
                              </div>
                              <div className="flex flex-col gap-2.5 overflow-hidden">
                                 <div className="bg-background border border-border/50 p-3 rounded-lg shadow-sm border-l-2 border-l-amber-500 transition-colors hover:border-border cursor-pointer relative overflow-hidden min-w-0">
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/10 rounded-bl-full" />
                                    <div className="text-[12px] font-semibold text-foreground mb-1 relative z-10 truncate pr-6">Brand Guidelines PDF</div>
                                    <div className="text-[10px] text-muted-foreground mb-3 leading-relaxed relative z-10 truncate">Awaiting client approval on typography layout.</div>
                                    <div className="flex justify-between items-center relative z-10">
                                       <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded font-medium">Client Review</span>
                                       <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-700">SW</div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </motion.div>

                     {/* Activity Feed */}
                     <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="flex-1 bg-background border border-border/50 rounded-xl shadow-sm flex flex-col overflow-hidden">
                        <div className="border-b border-border/50 p-4 bg-muted/20">
                           <span className="text-[13px] font-semibold text-foreground">Recent Activity</span>
                        </div>
                        <div className="p-4 flex flex-col gap-3 min-w-0">
                           <div className="flex gap-3 items-start min-w-0">
                              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></div>
                              <div className="min-w-0">
                                 <div className="text-[12px] font-medium text-foreground truncate">Invoice #1042 Paid</div>
                                 <div className="text-[10px] text-muted-foreground mt-0.5 truncate">2 hours ago</div>
                              </div>
                           </div>
                           <div className="flex gap-3 items-start min-w-0">
                              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5 text-amber-600" /></div>
                              <div className="min-w-0">
                                 <div className="text-[12px] font-medium text-foreground truncate">Feedback Received</div>
                                 <div className="text-[10px] text-muted-foreground mt-0.5 truncate">5 hours ago • Studio Rebrand</div>
                              </div>
                           </div>
                           <div className="flex gap-3 items-start min-w-0">
                              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5"><ArrowRight className="w-3.5 h-3.5 text-blue-600" /></div>
                              <div className="min-w-0">
                                 <div className="text-[12px] font-medium text-foreground truncate">Project Moved to 'Done'</div>
                                 <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Yesterday • Web Analytics</div>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                  </div>

               </div>
            </div>
         </div>

         {/* Decorative Floating Elements (Highly Animated) */}
         <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, ...float(1.4, 10) }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute right-6 top-24 bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl flex items-center gap-4 rotate-3 z-20"
         >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
               <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
               <div className="text-sm font-semibold">Invoice paid</div>
               <div className="text-xs text-muted-foreground">৳42,000 from Nexus Ltd</div>
            </div>
         </motion.div>

         <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, ...float(2.2, 8) }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="absolute left-6 bottom-24 bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl flex items-center gap-3 -rotate-2 z-20"
         >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
               <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm font-medium">"This looks perfect! Approved."</div>
         </motion.div>
      </motion.div>
   );
}
