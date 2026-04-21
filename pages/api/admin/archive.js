import { isAuthenticatedRequest } from '../../../lib/auth'
import { setEmbedArchived } from '../../../lib/store'

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

  await setEmbedArchived(req.body.slug, req.body.archived === '1')
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
