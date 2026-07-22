'use client';

import { useActionState } from 'react';
import { submitContactForm } from '@/app/actions/contact';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

interface ContactFormProps {
  title?: string;
  defaultMessage?: string;
}

export function ContactForm({ title = "Send us a message", defaultMessage = "" }: ContactFormProps = {}) {
  const [state, formAction, isPending] = useActionState(submitContactForm, null);

  if (state?.success) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-2xl p-8 text-center h-full flex flex-col justify-center items-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mb-4 mx-auto" />
        <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">Message Sent!</h3>
        <p className="text-green-700 dark:text-green-400 text-sm">We'll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-3xl p-8 border border-border shadow-sm">
      <h3 className="text-2xl font-semibold mb-6">{title}</h3>
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {state.error}
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              required 
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium">Message</label>
          <textarea 
            id="message"
            name="message" 
            required 
            rows={4}
            defaultValue={defaultMessage}
            placeholder="How can we help you?"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none" 
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
