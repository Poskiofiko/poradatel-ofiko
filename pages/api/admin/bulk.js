import { isAuthenticatedRequest } from '../../../lib/auth'
import { bulkUpdateEmbeds } from '../../../lib/store'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed')
    return
  }

  if (!isAuthenticatedRequest(req)) {
    res.writeHead(302, { Location: '/admin?error=Nejsi%20prihlaseny' })
    res.end()
    return
  }

  const changed = await bulkUpdateEmbeds(req.body.slug, req.body.action)
  const view = encodeURIComponent(req.body.view || 'all')

  res.writeHead(302, {
    Location: `/admin?message=${encodeURIComponent(
      `Hromadna akce probehla nad ${changed} odkazy`
    )}&view=${view}`,
  })
  res.end()
}
