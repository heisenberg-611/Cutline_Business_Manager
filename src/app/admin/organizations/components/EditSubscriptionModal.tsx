'use client';

import { useState } from 'react';
import { forceUpdateSubscription, revokeSubscription } from '../actions';
import { Button } from '@/components/ui/button';
import { X, Calendar, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { SubscriptionPlan } from '@prisma/client';

export function EditSubscriptionModal({ 
  business, 
  onClose,
  onOptimisticUpdate
}: { 
  business: any; 
  onClose: () => void;
  onOptimisticUpdate: (plan: string, end: string | null) => void;
}) {
  const [plan, setPlan] = useState<SubscriptionPlan>(business.subscriptionPlan || 'FREE');
  const [loading, setLoading] = useState(false);
  const [periodEnd, setPeriodEnd] = useState<string>(
    business.subscriptionPeriodEnd 
      ? new Date(business.subscriptionPeriodEnd).toISOString().split('T')[0] 
      : ''
  );

  const handleSet30Days = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setPeriodEnd(d.toISOString().split('T')[0]);
  };

  const handleSet1Year = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setPeriodEnd(d.toISOString().split('T')[0]);
  };

  const handleSetLifetime = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 100);
    setPeriodEnd(d.toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const end = periodEnd ? new Date(periodEnd) : null;
      
      // Fire optimistic update before server request completes
      onOptimisticUpdate(plan, periodEnd ? new Date(periodEnd).toISOString() : null);
      onClose(); // Close modal instantly for snappiness

      await forceUpdateSubscription(business.id, plan, end);
    } catch (err: any) {
      alert(err.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to instantly revoke this organization\'s access?')) return;
    setLoading(true);
    try {
      // Fire optimistic update
      onOptimisticUpdate('FREE', null);
      onClose();

      await revokeSubscription(business.id);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Subscription</h3>
            <p className="text-xs text-zinc-500 mt-1">{business.name} ({business.id})</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Plan Selection */}
          <div>
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 block">Forced Plan Tier</label>
            <div className="grid grid-cols-3 gap-3">
              {(['FREE', 'PRO', 'BUSINESS'] as SubscriptionPlan[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    plan === p 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300' 
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry Date Selection */}
          <div className={plan === 'FREE' ? 'opacity-50 pointer-events-none' : ''}>
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center justify-between">
              Expiration Date
              <span className="text-xs font-normal text-zinc-500">Local Time</span>
            </label>
            
            <input 
              type="date" 
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />

            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={handleSet30Days} className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                +30 Days
              </button>
              <button onClick={handleSet1Year} className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                +1 Year
              </button>
              <button onClick={handleSetLifetime} className="text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                Lifetime Access
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-red-100 dark:border-red-900/30">
            <button 
              onClick={handleRevoke}
              className="flex items-center justify-between w-full p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Instant Revoke</div>
                  <div className="text-xs opacity-80 mt-0.5">Force down to Free and wipe expiry</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </button>
          </div>

        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/50">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]" 
            onClick={handleSave} 
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Force Update'}
          </Button>
        </div>
      </div>
    </div>
  );
}
