import {
  createSessionToken,
  serializeSessionCookie,
  verifyAdminCredentials,
} from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed')
    return
  }

  const { username, password } = req.body

  if (!verifyAdminCredentials(username, password)) {
    res.writeHead(302, {
      Location: '/admin?error=Neplatne%20prihlaseni',
    })
    res.end()
    return
  }

  const token = createSessionToken(username)

  res.setHeader('Set-Cookie', serializeSessionCookie(token))
  res.writeHead(302, {
    Location: '/admin?message=Prihlaseni%20uspesne',
  })
  res.end()
}
