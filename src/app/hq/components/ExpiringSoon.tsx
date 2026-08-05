import Link from 'next/link';
import { CalendarClock, AlertTriangle } from 'lucide-react';

export type ExpiringBusiness = {
  id: string;
  name: string;
  plan: string;
  daysLeft: number;
  endsOn: string;
};

/**
 * Renewals are collected manually over bKash and approved by hand, so a
 * subscription lapsing is a thing someone has to act on before it happens.
 * Nothing in HQ surfaced that, which meant the first sign of a lapse was a
 * customer noticing their features had stopped working.
 */
export function ExpiringSoon({ businesses }: { businesses: ExpiringBusiness[] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-zinc-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Expiring in the next 14 days</h3>
        {businesses.length > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
            {businesses.length} to chase
          </span>
        )}
      </div>

      {businesses.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-zinc-500">
          Nothing expiring in the next two weeks.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {businesses.map((b) => (
            <li key={b.id} className="px-6 py-3 flex items-center gap-3">
              {b.daysLeft <= 3 && (
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {b.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {b.plan} · ends {b.endsOn}
                </p>
              </div>
              <span
                className={`text-xs font-semibold shrink-0 ${
                  b.daysLeft <= 3
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {b.daysLeft === 0
                  ? 'today'
                  : `${b.daysLeft} day${b.daysLeft === 1 ? '' : 's'}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/hq/organizations"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          Manage subscriptions →
        </Link>
      </div>
    </div>
  );
}
