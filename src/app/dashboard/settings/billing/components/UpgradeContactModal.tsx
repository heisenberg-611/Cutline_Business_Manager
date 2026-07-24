'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { submitUpgradeRequest } from '../actions';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export function UpgradeContactModal({ isUpgradePending = false }: { isUpgradePending?: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('Hi team, I would like to upgrade my workspace to the Business Plan.');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsPending(true);
    try {
      await submitUpgradeRequest(message);
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => setSuccess(false), 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isUpgradePending && !success ? (
        <button disabled className="block w-full rounded-md bg-indigo-100 dark:bg-indigo-900/30 px-3 py-2 text-center text-sm font-semibold text-indigo-400 dark:text-indigo-600 cursor-not-allowed border border-transparent">
          Request Pending
        </button>
      ) : (
        <a 
          onClick={() => setOpen(true)}
          className="cursor-pointer block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          Contact Sales
        </a>
      )}
      <DialogContent className="sm:max-w-[500px] bg-background rounded-3xl p-8 border border-border/50 shadow-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Contact Sales to Upgrade</DialogTitle>
        </DialogHeader>
        {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">Request Sent!</h3>
              <p className="text-muted-foreground mb-6">Your request to upgrade to the Business Plan has been submitted. Our team will review it shortly.</p>
              <button 
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-semibold mb-6">Upgrade to Business Plan</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Send us a message and we'll review your workspace to approve the upgrade. We'll grab your name and email automatically.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Message</label>
                  <textarea 
                    id="message"
                    required 
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your upgrade request..."
                    className="block w-full rounded-xl border-0 py-3 px-4 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white dark:bg-zinc-950 resize-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isPending || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Request
                    </>
                  )}
                </button>
              </form>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}
