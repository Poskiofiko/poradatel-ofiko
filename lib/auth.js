import crypto from 'crypto'

import { getAdminConfig } from './config'

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const withPadding =
    padding === 0 ? normalized : normalized + '='.repeat(4 - padding)

  return Buffer.from(withPadding, 'base64').toString('utf8')
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

function hashValue(value) {
  const { sessionSecret } = getAdminConfig()
  return crypto.scryptSync(value, sessionSecret, 32).toString('hex')
}

function encodeSession(payload) {
  const { sessionSecret } = getAdminConfig()
  const serialized = JSON.stringify(payload)
  const base = toBase64Url(serialized)
  const signature = sign(base, sessionSecret)

  return `${base}.${signature}`
}

function decodeSession(token) {
  const { sessionSecret } = getAdminConfig()

  if (!token || !token.includes('.')) {
    return null
  }

  const [base, signature] = token.split('.')

  if (!base || !signature) {
    return null
  }

  const expected = sign(base, sessionSecret)

  if (signature.length !== expected.length) {
    return null
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(base))

    if (!payload?.expiresAt) {
      return null
    }

    if (payload.expiresAt < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function verifyAdminCredentials(username, password) {
  const config = getAdminConfig()

  return (
    username === config.username &&
    password === config.password &&
    config.password !== 'change-me'
  )
}

export function createSessionToken(username) {
  return encodeSession({
    username,
    expiresAt: Date.now() + ONE_WEEK_IN_SECONDS * 1000,
  })
}

export function getSessionFromRequest(req) {
  const { cookieName } = getAdminConfig()
  const header = req.headers.cookie || ''
  const token = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)

  return decodeSession(token)
}

export function isAuthenticatedRequest(req) {
  return Boolean(getSessionFromRequest(req))
}

export function serializeSessionCookie(token) {
  const { cookieName } = getAdminConfig()
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''

  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_WEEK_IN_SECONDS}${secure}`
}

export function serializeLogoutCookie() {
  const { cookieName } = getAdminConfig()
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''

  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export function hashProtectedPassword(password) {
  return hashValue(password)
}

export function verifyProtectedPassword(password, expectedHash) {
  if (!password || !expectedHash) {
    return false
  }

  const actualHash = hashValue(password)

  if (actualHash.length !== expectedHash.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(actualHash),
    Buffer.from(expectedHash)
  )
}

function getLinkCookieName(slug) {
  return `poradatel_link_${slug}`
}

export function createLinkAccessToken(slug) {
  return encodeSession({
    slug,
    type: 'link-access',
    expiresAt: Date.now() + ONE_WEEK_IN_SECONDS * 1000,
  })
}

export function hasLinkAccess(req, slug) {
  const header = req.headers.cookie || ''
  const cookieName = getLinkCookieName(slug)
  const token = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)

  const payload = decodeSession(token)
  return Boolean(payload && payload.type === 'link-access' && payload.slug === slug)
}

export function serializeLinkAccessCookie(slug, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''

  return `${getLinkCookieName(
    slug
  )}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_WEEK_IN_SECONDS}${secure}`
}
