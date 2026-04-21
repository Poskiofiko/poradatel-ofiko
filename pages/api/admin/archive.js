import {
  isAuthenticatedRequest,
  serializeClearLinkAccessCookies,
} from '../../../lib/auth'
import { setEmbedArchived } from '../../../lib/store'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed')
    return
  }

  if (!isAuthenticatedRequest(req)) {
    if (req.headers['x-admin-json'] === '1') {
      return res.status(401).json({ error: 'Nejsi prihlaseny' })
    }
    res.writeHead(302, { Location: '/admin?error=Nejsi%20prihlaseny' })
    res.end()
    return
  }

  const archived = req.body.archived === '1'
  await setEmbedArchived(req.body.slug, archived)
  res.setHeader('Set-Cookie', serializeClearLinkAccessCookies(req.body.slug))

  if (req.headers['x-admin-json'] === '1') {
    return res.status(200).json({
      ok: true,
      slug: req.body.slug,
      archived,
      message: archived ? 'Embed byl archivovan' : 'Embed byl obnoven',
    })
  }

  const requestedView = req.body.view || (req.body.archived === '1' ? 'archived' : 'active')
  res.writeHead(302, {
    Location:
      req.body.archived === '1'
        ? `/admin?message=Embed%20byl%20archivovan&view=${encodeURIComponent(
            requestedView
          )}`
        : `/admin?message=Embed%20byl%20obnoven&view=${encodeURIComponent(
            requestedView === 'archived' ? 'active' : requestedView
          )}`,
  })
  res.end()
}
