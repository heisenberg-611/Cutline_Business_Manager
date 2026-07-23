'use client';

import { useActionState } from 'react';
import { submitContactForm } from '@/app/actions/contact';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

interface ContactFormProps {
  title?: string;
  defaultMessage?: string;
  source?: string;
}

export function ContactForm({ title = "Send us a message", defaultMessage = "", source = "Website Contact" }: ContactFormProps = {}) {
  const [state, formAction, isPending] = useActionState(submitContactForm, null);

  if (state?.success) {
    return (
      <div className="bg-background rounded-3xl p-8 border border-border/50 shadow-sm text-center h-full flex flex-col justify-center items-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground mb-2">Message Sent!</h3>
        <p className="text-muted-foreground">We'll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-3xl p-8 border border-border/50 shadow-sm">
      <h3 className="text-2xl font-semibold mb-6">{title}</h3>
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {state.error}
          </div>
        )}
        
        <input type="hidden" name="source" value={source} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">Name</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground" 
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              required 
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground" 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-foreground">Message</label>
          <textarea 
            id="message"
            name="message" 
            required 
            rows={4}
            defaultValue={defaultMessage}
            placeholder="How can we help you?"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none placeholder:text-muted-foreground" 
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
