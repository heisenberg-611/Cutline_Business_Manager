/**
 * Single source of truth for public-facing site details.
 *
 * These strings used to be typed inline on each marketing page, which is how
 * the homepage came to advertise `cutline.app` in its OpenGraph tags while
 * every email, invoice and link in the product used `cutlin.tech`. Anything
 * shown on more than one page belongs here.
 */

export const SITE = {
  name: 'Cutline OS',
  /** Matches NEXT_PUBLIC_APP_URL / the domain used by transactional email. */
  url: 'https://www.cutlin.tech',
  tagline: 'Your creative business, finally organized.',
  description:
    'Clients, projects, invoicing and feedback in one workspace built for creative studios.',
} as const

export const CONTACT = {
  support: 'support@cutlin.tech',
  sales: 'sales@cutlin.tech',
  /** Support hours are stated in the currency's own region (BDT / GMT+6). */
  hours: 'Sunday – Thursday, 10:00 – 18:00',
  timezone: 'GMT+6',
} as const

/**
 * Legal documents state a fixed revision date. Rendering `new Date()` — as both
 * pages previously did — makes the policy appear to have been revised on
 * whatever day the visitor happens to load it, which defeats the purpose of
 * publishing a revision date at all. Bump these by hand when the text changes.
 */
export const LEGAL_UPDATED = {
  privacy: 'August 4, 2026',
  terms: 'August 4, 2026',
} as const

export const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#about', label: 'About' },
] as const
