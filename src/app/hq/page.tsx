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

  const sixMonthsAgo = subMonths(startOfMonth(new Date()), 5);

  const [totalBusinesses, totalUsers, pendingRequests, businessesByPlan, liveSubscriptions] =
    await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
      prisma.business.groupBy({
        by: ['subscriptionPlan'],
        _count: { id: true }
      }),
      // Only subscriptions still inside the period they paid for. Grouping on
      // the raw column counted lapsed plans as revenue, and nothing transitions
      // a plan when its period ends, so that number could only drift upward.
      prisma.business.findMany({
        where: {
          subscriptionPlan: { not: 'FREE' },
          OR: [
            { subscriptionPeriodEnd: null }, // admin override: no expiry
            { subscriptionPeriodEnd: { gt: new Date() } },
          ],
        },
        select: { subscriptionPlan: true },
      })
    ]);

  // Current Monthly Recurring Revenue
  const currentMrr = liveSubscriptions.reduce((acc, business) => {
    return acc + (PLAN_PRICES[business.subscriptionPlan as keyof typeof PLAN_PRICES] || 0);
  }, 0);

  // Compute last 6 months charts natively using DB aggregations
  const revenueData: { month: string; revenue: number }[] = [];
  const growthData: { month: string; signups: number }[] = [];
  
  const monthQueries: Promise<any>[] = [];
  const monthNames: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthName = format(date, 'MMM');
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    monthNames.push(monthName);
    
    monthQueries.push(
      prisma.business.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } }
      })
    );
    monthQueries.push(
      // Same correction as the finances page: sum what was recorded as
      // collected rather than pricing a count at today's rates.
      prisma.subscriptionRequest.aggregate({
        where: { status: 'APPROVED', updatedAt: { gte: monthStart, lte: monthEnd } },
        _sum: { amountPaid: true }
      })
    );
  }

  const monthResults = await Promise.all(monthQueries);
  
  for (let i = 0; i < 6; i++) {
    const signupsForMonth = monthResults[i * 2] as number;
    const revenueForMonth = (monthResults[i * 2 + 1]?._sum?.amountPaid ?? 0) as number;

    revenueData.push({ month: monthNames[i], revenue: revenueForMonth });
    growthData.push({ month: monthNames[i], signups: signupsForMonth });
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
