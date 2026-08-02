import React from 'react'
import { formatMoney } from '@/lib/format'

interface Props {
  buckets: {
    '0-30': number
    '31-60': number
    '61-90': number
    '90+': number
  }
  currency?: string
}


export function AgingBucketsCard({ buckets, currency = 'USD' }: Props) {
  const total = Object.values(buckets).reduce((a, b) => a + b, 0)
  
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden w-full flex flex-col p-6 h-full">
      <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100 mb-4">Aging Outstanding Invoices</h3>
      
      {total === 0 ? (
        <p className="text-sm text-zinc-500">No outstanding invoices to age.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex h-4 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
            {buckets['0-30'] > 0 && (
              <div 
                style={{ width: `${(buckets['0-30'] / total) * 100}%` }} 
                className="bg-blue-500" 
                title={`0-30 Days: ${formatMoney(buckets['0-30'], currency)}`}
              />
            )}
            {buckets['31-60'] > 0 && (
              <div 
                style={{ width: `${(buckets['31-60'] / total) * 100}%` }} 
                className="bg-yellow-500" 
                title={`31-60 Days: ${formatMoney(buckets['31-60'], currency)}`}
              />
            )}
            {buckets['61-90'] > 0 && (
              <div 
                style={{ width: `${(buckets['61-90'] / total) * 100}%` }} 
                className="bg-orange-500" 
                title={`61-90 Days: ${formatMoney(buckets['61-90'], currency)}`}
              />
            )}
            {buckets['90+'] > 0 && (
              <div 
                style={{ width: `${(buckets['90+'] / total) * 100}%` }} 
                className="bg-red-500" 
                title={`90+ Days: ${formatMoney(buckets['90+'], currency)}`}
              />
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-zinc-500">0-30 Days</span>
              </div>
              <p className="mt-1 font-medium">{formatMoney(buckets['0-30'], currency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-zinc-500">31-60 Days</span>
              </div>
              <p className="mt-1 font-medium">{formatMoney(buckets['31-60'], currency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-zinc-500">61-90 Days</span>
              </div>
              <p className="mt-1 font-medium">{formatMoney(buckets['61-90'], currency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-zinc-500">90+ Days</span>
              </div>
              <p className="mt-1 font-medium text-red-600">{formatMoney(buckets['90+'], currency)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
