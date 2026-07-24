'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Lightbulb, Bug, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { submitPlatformFeedback } from '@/app/actions/feedback';
import { usePathname } from 'next/navigation';

export function PlatformFeedbackPill() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pathname = usePathname();

  // ONLY show on the exact dashboard route, not in sub-menus like /dashboard/projects
  if (pathname !== '/dashboard') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPlatformFeedback({
        type,
        message,
        url: window.location.href,
        email: email || undefined,
      });

      if (result.success) {
        toast.success('Feedback submitted successfully. Thank you!');
        setIsOpen(false);
        setMessage('');
        setEmail('');
      } else {
        toast.error(result.error || 'Failed to submit feedback');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed bottom-[90px] md:bottom-6 right-6 flex flex-col items-end ${isOpen ? 'z-[60]' : 'z-40'}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-4 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-indigo-500" />
                Send Feedback
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('idea')}
                  className={`flex-1 py-2 px-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                    type === 'idea'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  Idea
                </button>
                <button
                  type="button"
                  onClick={() => setType('issue')}
                  className={`flex-1 py-2 px-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                    type === 'issue'
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Bug className="w-4 h-4" />
                  Issue
                </button>
                <button
                  type="button"
                  onClick={() => setType('other')}
                  className={`flex-1 py-2 px-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs font-medium ${
                    type === 'other'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Other
                </button>
              </div>

              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  className="w-full h-28 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional, if you'd like a reply)"
                  className="w-full p-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-lg hover:shadow-xl transition-shadow font-medium text-sm z-50"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
        <span className="hidden sm:inline">{isOpen ? 'Close' : 'Feedback'}</span>
      </motion.button>
    </div>
  );
}
