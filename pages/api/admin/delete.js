import { isAuthenticatedRequest } from '../../../lib/auth'
import { deleteEmbed } from '../../../lib/store'

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

  await deleteEmbed(req.body.slug)
  res.writeHead(302, {
    Location: '/admin?message=Embed%20byl%20smazan',
  })
  res.end()
}
