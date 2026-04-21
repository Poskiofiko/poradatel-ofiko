import { isAuthenticatedRequest } from '../../../lib/auth'
import { duplicateEmbed } from '../../../lib/store'

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
    const duplicated = await duplicateEmbed(req.body.slug)
    res.writeHead(302, {
      Location: `/admin?message=${encodeURIComponent(
        `Vytvorena kopie ${duplicated.slug}`
      )}&slug=${encodeURIComponent(duplicated.slug)}&url=${encodeURIComponent(
        duplicated.url
      )}&protected=${duplicated.passwordProtected ? '1' : '0'}`,
    })
    res.end()
  } catch (error) {
    res.writeHead(302, {
      Location: `/admin?error=${encodeURIComponent(error.message)}`,
    })
    res.end()
  }
}
