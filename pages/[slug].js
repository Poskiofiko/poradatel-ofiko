import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { hasLinkAccess } from '../lib/auth'
import { getEmbedBySlug } from '../lib/store'

function ProtectedPage({ slug, error }) {
  return (
    <main className="shell shell-home public-home">
      <section className="panel centered-panel public-panel public-empty">
        <p className="eyebrow">Chraneny odkaz</p>
        <h1>Tenhle odkaz je pod heslem</h1>
        <p className="muted">
          Zadej heslo, ktere jsi dostal s odkazem. Po spravnem zadani se stranka otevre.
        </p>
        {error ? <p className="error-box">{error}</p> : null}
        <form className="stack protected-form" method="post" action="/api/access">
          <input type="hidden" name="slug" value={slug} />
          <label className="field">
            <span>Heslo</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button button-primary" type="submit">
            Odemknout odkaz
          </button>
        </form>
      </section>
    </main>
  )
}

export default function EmbedPage({ embed, requiresPassword, slug, error }) {
  const [showFallback, setShowFallback] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (requiresPassword || !embed) {
      return undefined
    }

    const showTimer = window.setTimeout(() => {
      if (hasLoaded) {
        return
      }

      setShowFallback(true)
    }, 2000)

    const hideTimer = window.setTimeout(() => {
      setShowFallback(false)
    }, 4000)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [embed, hasLoaded, requiresPassword])

  if (!embed) {
    return (
      <>
        <Head>
          <title>Odkaz nenalezen | Ofiko Poradatel</title>
          <meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex" />
        </Head>

        <main className="shell shell-home public-home">
          <section className="panel centered-panel public-panel public-empty">
            <p className="eyebrow">Odkaz nebyl nalezen</p>
            <h1>Tahle stránka neexistuje</h1>
            <p className="muted">
              Zadaný odkaz není aktivní nebo byl napsaný špatně. Zkontroluj URL
              a zkus to znovu.
            </p>
            <div className="hero-actions">
              <Link className="primary-link" href="/">
                Zpět na úvod
              </Link>
              <a
                className="secondary-link"
                href="https://ofiko.eu/kontakt"
                target="_blank"
                rel="noreferrer"
              >
                Kontakt Ofiko
              </a>
            </div>
          </section>
        </main>
      </>
    )
  }

  if (requiresPassword) {
    return (
      <>
        <Head>
          <title>{slug} | Ofiko Poradatel</title>
          <meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex" />
        </Head>
        <ProtectedPage slug={slug} error={error} />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{embed.slug} | Ofiko Poradatel</title>
        <meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex" />
      </Head>

      <main className="embed-page">
        <iframe
          className="embed-frame"
          src={embed.url}
          title={embed.slug}
          allow="clipboard-read; clipboard-write"
          loading="eager"
          onLoad={() => {
            setHasLoaded(true)
            setShowFallback(false)
          }}
        />

        {showFallback ? (
          <div className="embed-fallback">
            <span>Pokud se embed nezobrazi, otevri cilovou stranku primo.</span>
            <a href={embed.url} target="_blank" rel="noreferrer">
              Otevrit stranku
            </a>
          </div>
        ) : null}
      </main>
    </>
  )
}

export async function getServerSideProps({ params, req, res, query }) {
  res.setHeader(
    'Cache-Control',
    'private, no-store, no-cache, max-age=0, must-revalidate'
  )

  const embed = await getEmbedBySlug(params.slug, { includeSecrets: true })

  if (!embed) {
    res.statusCode = 404
  }

  const slug = params.slug
  const requiresPassword =
    Boolean(embed?.passwordHash) && !hasLinkAccess(req, embed.slug)
  const error = Array.isArray(query.error) ? query.error[0] : query.error || ''

  if (embed?.passwordHash) {
    delete embed.passwordHash
  }

  return {
    props: {
      embed,
      slug,
      requiresPassword,
      error,
    },
  }
}
