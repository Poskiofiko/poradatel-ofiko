import { isAuthenticatedRequest } from '../../../lib/auth'
import { bulkUpdateEmbeds } from '../../../lib/store'

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

  const changed = await bulkUpdateEmbeds(req.body.slug, req.body.action)
  if (req.headers['x-admin-json'] === '1') {
    return res.status(200).json({
      ok: true,
      action: req.body.action,
      slugs: Array.isArray(req.body.slug) ? req.body.slug : [req.body.slug],
      changed,
      message: `Hromadna akce probehla nad ${changed} odkazy`,
    })
  }
  const view = encodeURIComponent(req.body.view || 'all')

  res.writeHead(302, {
    Location: `/admin?message=${encodeURIComponent(
      `Hromadna akce probehla nad ${changed} odkazy`
    )}&view=${view}`,
  })
  res.end()
}
