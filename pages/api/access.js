import {
  createLinkAccessToken,
  serializeLinkAccessCookie,
  verifyProtectedPassword,
} from '../../lib/auth'
import { getEmbedBySlug, sanitizeSlug } from '../../lib/store'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed')
    return
  }

  const slug = sanitizeSlug(req.body.slug)
  const password = String(req.body.password || '')

  if (!slug) {
    res.writeHead(302, { Location: '/?error=Neplatny%20odkaz' })
    res.end()
    return
  }

  const embed = await getEmbedBySlug(slug, { includeSecrets: true })

  if (!embed || !embed.passwordHash) {
    res.writeHead(302, { Location: `/${slug}` })
    res.end()
    return
  }

  if (!verifyProtectedPassword(password, embed.passwordHash)) {
    res.writeHead(302, {
      Location: `/${slug}?error=${encodeURIComponent('Spatne heslo')}`,
    })
    res.end()
    return
  }

  const token = createLinkAccessToken(slug)
  res.setHeader('Set-Cookie', serializeLinkAccessCookie(slug, token))
  res.writeHead(302, { Location: `/${slug}` })
  res.end()
}
