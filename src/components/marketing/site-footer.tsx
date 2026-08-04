import React from 'react';
import Link from 'next/link';
import { Clock, Mail, MessageSquare } from 'lucide-react';
import { CONTACT, SITE } from '@/lib/site';

const PRODUCT_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#faq', label: 'FAQ' },
];

/** Shared by the homepage and the legal pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-muted/10 pb-8 pt-16">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-5 md:gap-12">
          <div className="col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <img src="/icon.svg" alt="" aria-hidden className="h-6 w-6 object-contain" />
              <span className="text-lg font-semibold tracking-tight text-foreground">
                {SITE.name}
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {SITE.tagline} {SITE.description}
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-foreground">Product</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-foreground">Legal</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="transition-colors hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-foreground">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${CONTACT.support}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="break-all">{CONTACT.support}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.sales}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="break-all">{CONTACT.sales}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 text-sm text-muted-foreground md:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-center md:text-right">
            <Clock className="h-4 w-4 shrink-0" />
            Support {CONTACT.hours} ({CONTACT.timezone})
          </p>
        </div>
      </div>
    </footer>
  );
}
