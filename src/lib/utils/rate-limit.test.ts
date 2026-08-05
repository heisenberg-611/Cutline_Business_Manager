import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The limiters are module-level singletons built from env at import time, so
 * each case imports the module fresh with the environment it needs.
 */
const REDIS_ENV = {
  UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'fake-token',
}

const mockLimit = vi.fn()

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = () => ({})
    limit = (...args: unknown[]) => mockLimit(...args)
  },
}))
vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: () => ({}) } }))
vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '1.2.3.4']]),
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  Object.assign(process.env, REDIS_ENV)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('checkRateLimit', () => {
  it('allows a request under the limit', async () => {
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })
    const { checkRateLimit } = await import('./rate-limit')

    await expect(checkRateLimit()).resolves.toBeUndefined()
  })

  it('rejects a request over the limit', async () => {
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 60_000 })
    const { checkRateLimit } = await import('./rate-limit')

    await expect(checkRateLimit()).rejects.toThrow('Too many requests')
  })

  it('allows the request when Redis itself errors', async () => {
    // The behaviour that matters: an outage, or an out-of-memory write
    // rejection with eviction disabled, must not take a customer's public
    // intake and feedback forms offline. Previously this error propagated
    // straight out of the Server Action.
    mockLimit.mockRejectedValue(new Error('ERR max memory reached'))
    const { checkRateLimit } = await import('./rate-limit')

    await expect(checkRateLimit()).resolves.toBeUndefined()
  })
})

describe('checkMessageRateLimit', () => {
  it('rejects over the limit and survives an outage', async () => {
    mockLimit.mockResolvedValue({ success: false })
    let mod = await import('./rate-limit')
    await expect(mod.checkMessageRateLimit('user_1')).rejects.toThrow('too quickly')

    vi.resetModules()
    mockLimit.mockRejectedValue(new Error('connection refused'))
    mod = await import('./rate-limit')
    await expect(mod.checkMessageRateLimit('user_1')).resolves.toBeUndefined()
  })
})

describe('checkAdminAuthRateLimit', () => {
  it('reports a breach with a wait time of at least a minute', async () => {
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 90_000 })
    const { checkAdminAuthRateLimit } = await import('./rate-limit')

    const result = await checkAdminAuthRateLimit('1.2.3.4')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/try again after \d+ minutes/)
  })

  it('allows the attempt when Redis errors, since account lockout still applies', async () => {
    mockLimit.mockRejectedValue(new Error('timeout'))
    const { checkAdminAuthRateLimit } = await import('./rate-limit')

    await expect(checkAdminAuthRateLimit('1.2.3.4')).resolves.toEqual({ success: true })
  })
})

describe('when Upstash is not configured', () => {
  it('does nothing and never blocks', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const mod = await import('./rate-limit')

    await expect(mod.checkRateLimit()).resolves.toBeUndefined()
    await expect(mod.checkMessageRateLimit('user_1')).resolves.toBeUndefined()
    await expect(mod.checkAdminAuthRateLimit('1.2.3.4')).resolves.toEqual({ success: true })
    expect(mockLimit).not.toHaveBeenCalled()
  })

  // The severity of the unconfigured log is deliberately not asserted: Vite
  // inlines process.env.NODE_ENV at transform time, so it cannot be varied from
  // a test at runtime. The behaviour that matters — never blocking when the
  // limiter is absent — is covered above.
})
