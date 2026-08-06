import { unstable_cache, updateTag } from 'next/cache'
import prisma from '@/modules/core/db/prisma'

/**
 * The two rows the dashboard layout reads on every render.
 *
 * Neither is per-user and neither changes often, but the layout wraps every
 * /dashboard route — and a Server Action's revalidation re-renders the tree
 * from the root down, layouts included. So ticking a task re-read the active
 * alerts and the global settings, as did every other mutation anywhere in the
 * app.
 *
 * Cached across requests with a tag rather than a short TTL, because one of
 * these is the maintenance-mode switch: an operator turning it on needs it to
 * take effect on the next render, not whenever a window happens to lapse. The
 * TTL is only a backstop for a tag invalidation that never ran.
 */

export const GLOBAL_SETTINGS_TAG = 'global-settings'
export const SYSTEM_ALERTS_TAG = 'system-alerts'

/** Backstop only; the tags above are what normally invalidates these. */
const FALLBACK_TTL_SECONDS = 300

export const getCachedGlobalSettings = unstable_cache(
  async () => prisma.globalSettings.findUnique({ where: { id: 'default' } }),
  ['global-settings'],
  { tags: [GLOBAL_SETTINGS_TAG], revalidate: FALLBACK_TTL_SECONDS }
)

export const getCachedActiveAlerts = unstable_cache(
  async () =>
    prisma.systemAlert.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
  ['active-system-alerts'],
  { tags: [SYSTEM_ALERTS_TAG], revalidate: FALLBACK_TTL_SECONDS }
)

/**
 * Call after writing GlobalSettings, or the change waits out the TTL.
 *
 * updateTag rather than revalidateTag: it gives read-your-own-writes, so the
 * operator who just switched maintenance mode on sees it applied rather than
 * a still-cached copy. Only valid inside a Server Action, which both call
 * sites are.
 */
export function invalidateGlobalSettings() {
  updateTag(GLOBAL_SETTINGS_TAG)
}

/** Call after creating, updating or deleting a SystemAlert. */
export function invalidateSystemAlerts() {
  updateTag(SYSTEM_ALERTS_TAG)
}
