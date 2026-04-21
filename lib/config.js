export const STORAGE_PATH = 'embeds/config.json'

export function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'change-me',
    sessionSecret:
      process.env.ADMIN_SESSION_SECRET || 'please-change-this-secret',
    cookieName: 'poradatel_admin_session',
  }
}

export function getBaseUrlFromRequest(req) {
  const forwardedProto = req.headers['x-forwarded-proto']
  const forwardedHost = req.headers['x-forwarded-host']
  const host = forwardedHost || req.headers.host || 'localhost:3000'
  const protocol =
    forwardedProto || (String(host).startsWith('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}
