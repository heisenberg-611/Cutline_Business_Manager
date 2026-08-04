"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { EASE } from '@/components/ui/scroll-animation';
import { NAV_LINKS, SITE } from '@/lib/site';

/**
 * Shared across the homepage and the legal pages so all three carry the same
 * chrome. The legal pages previously had only a bare "Back to Home" link.
 *
 * `signedIn` is optional on purpose. The homepage is server-rendered per request
 * anyway, so it passes the value down and the CTA is correct in the first paint.
 * The legal pages are pure static content — having them call `auth()` just to
 * style one button would turn two cacheable, bot-crawled pages into a serverless
 * invocation per view. They omit the prop and let Clerk resolve it on the client.
 */
export function SiteHeader({ signedIn }: { signedIn?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const reduce = useReducedMotion();

  const { isLoaded, isSignedIn } = useAuth();
  // `undefined` means "not known yet" and renders a neutral placeholder, so the
  // header never flashes "Log in" at someone who is already signed in.
  const authed = signedIn ?? (isLoaded ? isSignedIn : undefined);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The menu overlays the page, so the body must not scroll underneath it.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-xl'
          : 'border-b border-transparent bg-background/60 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-2 lg:w-1/3">
          <img src="/icon.svg" alt="" aria-hidden className="h-7 w-7 object-contain" />
          <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
        </Link>

        <nav className="hidden items-center justify-center gap-1 md:flex lg:w-1/3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-foreground/40 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 lg:w-1/3">
          {authed === undefined ? (
            // Reserves the button's footprint so resolving auth causes no shift.
            <div aria-hidden className="h-9 w-[104px] rounded-full bg-muted/60" />
          ) : authed ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Start free
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.35, ease: EASE }}
            className="overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col px-4 py-4 sm:px-6">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.05 + i * 0.05, duration: 0.3, ease: EASE }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {authed === false && (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 block rounded-lg border border-border px-3 py-3 text-center text-base font-medium sm:hidden"
                >
                  Log in
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
