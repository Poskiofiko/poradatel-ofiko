import { isAuthenticatedRequest } from '../../../lib/auth'
import { setEmbedEnabled } from '../../../lib/store'

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

  const isEnabled = req.body.isEnabled === '1'
  await setEmbedEnabled(req.body.slug, isEnabled)
  const view = encodeURIComponent(req.body.view || 'all')

  res.writeHead(302, {
    Location: `/admin?message=${encodeURIComponent(
      isEnabled ? 'Odkaz byl zapnut' : 'Odkaz byl vypnut'
    )}&view=${view}`,
  })
  res.end()
}
