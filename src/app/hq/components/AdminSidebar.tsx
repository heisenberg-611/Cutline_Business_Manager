'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, Users, CreditCard, Activity, LogOut, ShieldAlert, Settings, Building2, Megaphone, ShieldCheck, MessageSquare, Flag } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { AdminNotifications } from './AdminNotifications';

const NAV_ITEMS = [
  { href: '/hq', label: 'Overview', icon: Home, exact: true },
  { href: '/hq/subscriptions', label: 'Subscriptions', icon: Activity },
  { href: '/hq/finances', label: 'Finances', icon: CreditCard },
  { href: '/hq/messages', label: 'Messages', icon: MessageSquare },
  { href: '/hq/organizations', label: 'Organizations', icon: Building2 },
  { href: '/hq/users', label: 'Users', icon: Users },
  { href: '/hq/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { href: '/hq/feedback', label: 'Feedback', icon: Flag },
  { href: '/hq/audit', label: 'Audit Logs', icon: ShieldCheck },
  { href: '/hq/admins', label: 'Admins', icon: ShieldAlert },
  { href: '/hq/settings', label: 'Platform Settings', icon: Settings },
];

export function AdminSidebar({ 
  adminEmail, 
  logoutAction 
}: { 
  adminEmail: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname() || '';

  useEffect(() => {
    if (adminEmail) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.login(`admin_${adminEmail}`);
      });
    }
  }, [adminEmail]);

  return (
    <aside className="w-16 md:w-64 shrink-0 bg-background/60 backdrop-blur-xl border-r border-border/50 flex flex-col shadow-2xl z-20 transition-all duration-300">
      <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border/50 shrink-0">
        <img src="/icon.svg" alt="Cutline OS" className="w-8 h-8 md:mr-3 rounded-md object-cover shadow-sm shrink-0" />
        <h1 className="hidden md:block font-bold text-foreground tracking-tight">Cutline Admin</h1>
      </div>
      <nav className="flex-1 p-2 md:p-4 space-y-2 md:space-y-1 overflow-y-auto overflow-x-hidden">
        <LayoutGroup>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          
          return (
              <Link
              key={item.href}
              href={item.href}
              className={`group relative z-0 flex items-center justify-center md:justify-start md:gap-3 px-3 py-3 md:py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5 shrink-0 relative z-10" />
              <span className="hidden md:block relative z-10">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="adminNavPill"
                  className="absolute inset-0 bg-primary shadow-sm rounded-md -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
        </LayoutGroup>
      </nav>
      <div className="p-2 md:p-4 border-t border-border/50 space-y-2 bg-background/40 shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="hidden md:block text-xs text-muted-foreground text-center mb-2 truncate font-medium">
          {adminEmail}
        </div>
        <div className="hidden md:block">
          <ThemeToggle isCollapsed={false} />
        </div>
        <div className="md:hidden">
          <ThemeToggle isCollapsed={true} />
        </div>
        <AdminNotifications />
        <form action={logoutAction}>
          <button type="submit" title="Lock Panel" className="w-full flex items-center justify-center gap-2 px-3 py-3 md:py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="w-5 h-5 shrink-0" /> <span className="hidden md:block">Lock</span>
          </button>
        </form>
        <Link href="/dashboard" title="Back to App" className="hidden md:block text-center text-sm text-primary font-medium hover:underline mt-2">
          ← Back to App
        </Link>
      </div>
    </aside>
  );
}
