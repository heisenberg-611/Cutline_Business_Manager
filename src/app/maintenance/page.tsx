import prisma from '@/modules/core/db/prisma';
import { redirect } from 'next/navigation';
import { Wrench } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Under Maintenance',
};

export default async function MaintenancePage() {
  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'default' }
  });

  // If maintenance mode is somehow turned off, instantly redirect them back to the app!
  if (!settings?.maintenanceMode) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 text-foreground">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-primary/20">
          <Wrench className="w-10 h-10 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">We'll be right back!</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Cutline OS is currently undergoing scheduled maintenance to upgrade the platform. We expect to be back online shortly.
          </p>
        </div>

        <div className="pt-4">
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline underline-offset-4">
            Try refreshing the page
          </Link>
        </div>
      </div>
    </div>
  );
}
