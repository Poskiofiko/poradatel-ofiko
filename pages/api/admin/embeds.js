import { isAuthenticatedRequest } from '../../../lib/auth'
import { saveEmbed } from '../../../lib/store'

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

  try {
    await saveEmbed({
      slug: req.body.slug,
      url: req.body.url,
      password: req.body.password,
      removePassword: req.body.removePassword,
      category: req.body.category,
      note: req.body.note,
      tags: req.body.tags,
      expiresAt: req.body.expiresAt,
      isEnabled: req.body.isEnabled,
    })

    res.writeHead(302, {
      Location: `/admin?message=Embed%20byl%20ulozen&view=${encodeURIComponent(
        req.body.view || 'all'
      )}`,
    })
    res.end()
  } catch (error) {
    res.writeHead(302, {
      Location: `/admin?error=${encodeURIComponent(error.message)}`,
    })
    res.end()
  }
}
