/**
 * Signed HQ admin session cookies.
 *
 * The cookie used to be the admin's email in plaintext, which meant the session
 * token carried no secret at all: anyone able to plant a cookie was an admin.
 * It is now `payload.signature`, where the signature is an HMAC-SHA256 over the
 * payload.
 *
 * Built on Web Crypto rather than node:crypto specifically so middleware can
 * verify a session in the edge runtime, where neither node:crypto nor Prisma is
 * available. That is what lets the middleware gate become a real check instead
 * of a presence test.
 *
 * Signature verification alone is not authentication: it proves the cookie was
 * issued by us and has not expired. verifyAdminSession still loads the admin
 * from the database, so removing an admin takes effect on their next request.
 *
 * Signed with ADMIN_SESSION_SECRET, deliberately NOT with ADMIN_SECRET_KEY.
 * The latter is the ?key= gate value: it is typed by hand, shared, and travels
 * in URLs, so reusing it here would mean anyone who ever saw a gate link could
 * mint their own admin session.
 */

export type AdminSessionPayload = {
  email: string
  /** Issued at, epoch seconds. Compared against GlobalAdmin.sessionsValidFrom. */
  iat: number
  /** Expires at, epoch seconds. */
  exp: number
}

/**
 * Fails closed. A missing secret previously fell back to a literal committed to
 * a public repository; refusing to sign is the only safe response.
 */
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET is missing or too short (need at least 32 characters). ' +
        'HQ admin sessions cannot be signed without it. Generate one with: ' +
        'openssl rand -base64 48'
    )
  }
  return secret
}

/** True when a secret is usable, for callers that must not throw (middleware). */
export function hasAdminSecret(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET
  return Boolean(secret && secret.length >= 32)
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function hmac(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

/** Constant-time compare, so a signature cannot be recovered by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signAdminSession(email: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminSessionPayload = { email, iat: now, exp: now + ttlSeconds }
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  return `${encoded}.${await hmac(encoded)}`
}

/**
 * Returns the payload only for a cookie we signed that has not expired.
 * Null for anything else — tampered, truncated, forged or stale.
 */
export async function verifyAdminSessionCookie(
  value: string | undefined
): Promise<AdminSessionPayload | null> {
  if (!value) return null

  const separator = value.lastIndexOf('.')
  if (separator <= 0) return null

  const encoded = value.slice(0, separator)
  const signature = value.slice(separator + 1)

  let expected: string
  try {
    expected = await hmac(encoded)
  } catch {
    // No usable secret. Fail closed rather than admit an unverifiable cookie.
    return null
  }

  if (!safeEqual(signature, expected)) return null

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encoded))
    ) as AdminSessionPayload

    if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
