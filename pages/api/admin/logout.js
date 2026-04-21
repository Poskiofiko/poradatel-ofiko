import { serializeLogoutCookie } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed')
    return
  }

  res.setHeader('Set-Cookie', serializeLogoutCookie())
  res.writeHead(302, { Location: '/admin' })
  res.end()
}
