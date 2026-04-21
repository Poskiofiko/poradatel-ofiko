import { isAuthenticatedRequest } from '../../../lib/auth'
import { setEmbedEnabled } from '../../../lib/store'

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

  const isEnabled = req.body.isEnabled === '1'
  await setEmbedEnabled(req.body.slug, isEnabled)

  if (req.headers['x-admin-json'] === '1') {
    return res.status(200).json({
      ok: true,
      slug: req.body.slug,
      isEnabled,
      message: isEnabled ? 'Odkaz byl zapnut' : 'Odkaz byl vypnut',
    })
  }

  const view = encodeURIComponent(req.body.view || 'all')

  res.writeHead(302, {
    Location: `/admin?message=${encodeURIComponent(
      isEnabled ? 'Odkaz byl zapnut' : 'Odkaz byl vypnut'
    )}&view=${view}`,
  })
  res.end()
}
