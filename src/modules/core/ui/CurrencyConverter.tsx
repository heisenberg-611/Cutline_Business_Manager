'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRightLeft, RefreshCw } from 'lucide-react'

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

export function CurrencyConverter({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [amount, setAmount] = useState<string>('100')
  const [sourceCurrency, setSourceCurrency] = useState('USD')
  const [targetCurrency, setTargetCurrency] = useState('EUR')
  
  const [result, setResult] = useState<number | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const fetchRate = async () => {
      if (!amount || isNaN(Number(amount))) {
        setResult(null)
        return
      }
      
      if (sourceCurrency === targetCurrency) {
        setResult(Number(amount))
        setRate(1)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${sourceCurrency}`)
        if (!res.ok) throw new Error('Failed to fetch rate')
        
        const data = await res.json()
        const fetchedRate = data.rates[targetCurrency]
        
        if (fetchedRate) {
          setRate(fetchedRate)
          setResult(Number(amount) * fetchedRate)
        } else {
          throw new Error('Currency not supported')
        }
      } catch (err) {
        console.error(err)
        setError('Failed to fetch exchange rate.')
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchRate()
    }, 300) // debounce

    return () => clearTimeout(timer)
  }, [amount, sourceCurrency, targetCurrency, open])

  const swapCurrencies = () => {
    setSourceCurrency(targetCurrency)
    setTargetCurrency(sourceCurrency)
  }

  const formatCurrency = (val: number, code: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(val)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 sm:max-w-[425px] w-[95vw] sm:w-full rounded-xl">
        <DialogHeader>
          <DialogTitle>Currency Converter</DialogTitle>
          <DialogDescription>
            Live exchange rates powered by exchangerate-api.com
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input 
              id="amount" 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="grid gap-2 flex-1">
              <Label>From</Label>
              <Select value={sourceCurrency} onValueChange={(val) => val && setSourceCurrency(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent className="w-[180px]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button 
              onClick={swapCurrencies}
              className="mt-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
            </button>

            <div className="grid gap-2 flex-1">
              <Label>To</Label>
              <Select value={targetCurrency} onValueChange={(val) => val && setTargetCurrency(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent className="w-[180px]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 p-4 mt-2 flex flex-col items-center justify-center min-h-[100px]">
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : result !== null ? (
              <>
                <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(result, targetCurrency)}
                </div>
                {rate && (
                  <p className="text-xs text-zinc-500 mt-2">
                    1 {sourceCurrency} = {rate} {targetCurrency}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Enter an amount</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
