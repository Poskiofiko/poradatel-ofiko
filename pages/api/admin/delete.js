import {
  isAuthenticatedRequest,
  serializeClearLinkAccessCookies,
} from '../../../lib/auth'
import { deleteEmbed } from '../../../lib/store'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthenticatedRequest(req)) {
    if (req.headers['x-admin-json'] === '1') {
      return res.status(401).json({ error: 'Nejsi prihlaseny' })
    }

    res.writeHead(302, { Location: '/admin?error=Nejsi%20prihlaseny' })
    res.end()
    return
  }

  try {
    const slug = String(req.body?.slug || '').trim()

    if (!slug) {
      return res.status(400).json({ error: 'Chybi slug odkazu ke smazani' })
    }

    const deleted = await deleteEmbed(slug)

    if (!deleted) {
      return res.status(404).json({
        error: 'Odkaz se nepodarilo smazat nebo neexistuje',
      })
    }

    res.setHeader('Set-Cookie', serializeClearLinkAccessCookies(slug))

    if (req.headers['x-admin-json'] === '1') {
      return res.status(200).json({
        ok: true,
        slug,
        message: 'Embed byl smazan',
      })
    }

    const view = encodeURIComponent(req.body?.view || 'all')
    res.writeHead(302, {
      Location: `/admin?message=Embed%20byl%20smazan&view=${view}`,
    })
    res.end()
  } catch (error) {
    console.error('DELETE EMBED ERROR:', error)

    if (req.headers['x-admin-json'] === '1') {
      return res.status(500).json({
        error: 'Mazani selhalo na serveru',
      })
    }

    res.writeHead(302, {
      Location: '/admin?error=Mazani%20selhalo%20na%20serveru',
    })
    res.end()
  }
}