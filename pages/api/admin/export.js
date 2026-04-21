import { isAuthenticatedRequest } from '../../../lib/auth'
import { exportEmbedsToCsv, listEmbeds } from '../../../lib/store'
import { getBaseUrlFromRequest } from '../../../lib/config'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end('Method not allowed')
    return
  }

  if (!isAuthenticatedRequest(req)) {
    res.status(401).end('Nejsi prihlaseny')
    return
  }

  const baseUrl = getBaseUrlFromRequest(req)
  const embeds = (await listEmbeds()).map((embed) => ({
    ...embed,
    publicUrl: `${baseUrl}/${embed.slug}`,
  }))

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="poradatel-links-${new Date().toISOString().slice(0, 10)}.csv"`
  )
  res.status(200).send(exportEmbedsToCsv(embeds))
}
