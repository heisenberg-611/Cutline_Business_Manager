'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateBusinessCurrency } from '@/modules/settings/actions'

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
]

export function CurrencySelector({ currentCurrency }: { currentCurrency: string }) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = React.useState(currentCurrency)

  const handleChange = (val: string | null) => {
    if (!val) return
    setValue(val)
    startTransition(async () => {
      await updateBusinessCurrency(val)
    })
  }

  return (
    <div className="flex items-center gap-4">
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="font-mono mr-2">{c.symbol}</span>
              {c.code} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <span className="text-xs text-zinc-400">Saving...</span>}
    </div>
  )
}
