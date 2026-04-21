import { isAuthenticatedRequest } from '../../../lib/auth'
import { deleteEmbed } from '../../../lib/store'

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

  await deleteEmbed(req.body.slug)
  if (req.headers['x-admin-json'] === '1') {
    return res.status(200).json({
      ok: true,
      slug: req.body.slug,
      message: 'Embed byl smazan',
    })
  }
  const view = encodeURIComponent(req.body.view || 'all')
  res.writeHead(302, {
    Location: `/admin?message=Embed%20byl%20smazan&view=${view}`,
  })
  res.end()
}
