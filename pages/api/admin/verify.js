import { isAuthenticatedRequest } from '../../../lib/auth'
import { getEmbedBySlug } from '../../../lib/store'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end('Method not allowed')
    return
  }

  if (!isAuthenticatedRequest(req)) {
    return res.status(401).json({ error: 'Nejsi prihlaseny' })
  }

  const embed = await getEmbedBySlug(req.query.slug)

  if (!embed) {
    return res.status(404).json({ exists: false })
  }

  return res.status(200).json({ exists: true, embed })
}
