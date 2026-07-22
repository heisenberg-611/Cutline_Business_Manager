import prisma from '@/modules/core/db/prisma';
import { Users, Briefcase, Activity, CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import { requireAdmin } from './actions';
import { PLAN_PRICES } from '@/lib/subscription';
import { RevenueChart } from './components/RevenueChart';
import { GrowthChart } from './components/GrowthChart';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const metadata = {
  title: 'Admin Overview',
};

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [totalBusinesses, totalUsers, pendingRequests, allBusinesses, approvedRequests] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
    prisma.business.findMany({ select: { subscriptionPlan: true, createdAt: true } }),
    prisma.subscriptionRequest.findMany({ 
      where: { status: 'APPROVED' }, 
      select: { businessId: true, planRequested: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
  ]);

  // Compute Current MRR
  let currentMrr = 0;
  allBusinesses.forEach(b => {
    if (b.subscriptionPlan === 'PRO') currentMrr += PLAN_PRICES.PRO;
    if (b.subscriptionPlan === 'BUSINESS') currentMrr += PLAN_PRICES.BUSINESS;
  });

  // Compute last 6 months charts
  const revenueData: { month: string; revenue: number }[] = [];
  const growthData: { month: string; signups: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthName = format(date, 'MMM');
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    let mrrForMonth = 0;
    let signupsForMonth = 0;

    // Calculate Total Monthly Revenue based on all payments (approved requests) in the month
    approvedRequests.forEach(req => {
      if (req.updatedAt >= start && req.updatedAt <= end) {
        if (req.planRequested === 'PRO') mrrForMonth += PLAN_PRICES.PRO;
        if (req.planRequested === 'BUSINESS') mrrForMonth += PLAN_PRICES.BUSINESS;
      }
    });

    allBusinesses.forEach(b => {
      if (b.createdAt >= start && b.createdAt <= end) {
        signupsForMonth++;
      }
    });

    revenueData.push({ month: monthName, revenue: mrrForMonth });
    growthData.push({ month: monthName, signups: signupsForMonth });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Overview</h2>
        <p className="text-sm text-zinc-500">High-level metrics for Cutline OS.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Businesses</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalBusinesses}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Total Users</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalUsers}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pendingRequests}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">Current MRR</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${currentMrr}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Monthly Revenue</h3>
              <p className="text-sm text-zinc-500">Total revenue from all subscriptions</p>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <RevenueChart data={revenueData} />
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Platform Growth</h3>
              <p className="text-sm text-zinc-500">New organizations per month</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <GrowthChart data={growthData} />
        </div>
      </div>
    </div>
  );
}
