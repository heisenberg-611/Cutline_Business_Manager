import { describe, it, expect } from 'vitest'
import {
  allProjectCollabChannels,
  conversationChannel,
  pipelineChannel,
  projectCollabChannel,
  userNotificationsChannel,
  userSidebarChannel,
} from './channels'

/**
 * These names are only ever compared by Ably, never by us, so a drift between a
 * publisher and a subscriber — or between a channel and the wildcard meant to
 * grant it — surfaces as "realtime silently does nothing" with no error
 * anywhere. That is the failure these assertions exist to catch.
 */

/** How Ably matches a trailing `*`: everything up to it, then any remainder. */
function wildcardCovers(pattern: string, channel: string) {
  if (!pattern.endsWith('*')) return pattern === channel
  const prefix = pattern.slice(0, -1)
  return channel.startsWith(prefix) && channel.length > prefix.length
}

describe('project collaboration channels', () => {
  it('puts the project id last, so a trailing wildcard can cover it', () => {
    expect(projectCollabChannel('org_1', 'proj_1')).toBe('business:org_1:collab:proj_1')
  })

  it('is covered by the admin wildcard for the same business', () => {
    const pattern = allProjectCollabChannels('org_1')
    expect(wildcardCovers(pattern, projectCollabChannel('org_1', 'proj_1'))).toBe(true)
    expect(wildcardCovers(pattern, projectCollabChannel('org_1', 'proj_2'))).toBe(true)
  })

  // The wildcard is what an admin's token grants; leaking across businesses
  // would hand them another tenant's project activity.
  it('does not reach another business', () => {
    const pattern = allProjectCollabChannels('org_1')
    expect(wildcardCovers(pattern, projectCollabChannel('org_2', 'proj_1'))).toBe(false)
  })

  // business:org_1:collab:* must not also swallow the pipeline or conversation
  // channels, which carry different data and different grants.
  it('does not cover the other channels in the business namespace', () => {
    const pattern = allProjectCollabChannels('org_1')
    expect(wildcardCovers(pattern, pipelineChannel('org_1'))).toBe(false)
    expect(wildcardCovers(pattern, conversationChannel('org_1', 'conv_1'))).toBe(false)
  })
})

describe('per-user channels', () => {
  // Both sit outside business:{id}:* on purpose: a member token grants that
  // whole namespace, so a feed placed under it would be readable by every other
  // member of the organization.
  it('stay outside the business namespace', () => {
    expect(userNotificationsChannel('user_1').startsWith('business:')).toBe(false)
    expect(userSidebarChannel('user_1').startsWith('business:')).toBe(false)
  })
})
