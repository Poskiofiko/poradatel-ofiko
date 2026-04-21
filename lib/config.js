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
