'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ContactForm } from '@/components/marketing/ContactForm';

export function UpgradeContactModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <a 
        onClick={() => setOpen(true)}
        className="cursor-pointer block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
      >
        Contact Sales
      </a>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-transparent border-none shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Contact Sales to Upgrade</DialogTitle>
        </DialogHeader>
        <div className="bg-background">
          <ContactForm 
            title="Upgrade to Business Plan" 
            defaultMessage="Hi team, I would like to upgrade my workspace to the Business Plan." 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
