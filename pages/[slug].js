import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { hasLinkAccess } from '../lib/auth'
import { getEmbedBySlug, incrementEmbedView } from '../lib/store'

function PublicHead({ title }) {
  return (
    <Head>
      <title>{title}</title>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <meta name="robots" content="noindex,nofollow" />
    </Head>
  )
}

function ProtectedPage({ slug, error, title, description }) {
  return (
    <main className="shell shell-home public-home public-lock-shell">
      <section className="panel centered-panel public-panel public-empty public-lock-panel">
        <div className="public-lock-icon">
          <span className="material-icons">lock</span>
        </div>
        <p className="eyebrow">Chraneny odkaz</p>
        <h1>{title}</h1>
        <p className="muted public-lock-copy">{description}</p>

        {error && <p className="error-box">{error}</p>}

        <form method="post" action="/api/access" className="stack protected-form">
          <input type="hidden" name="slug" value={slug} />
          <label className="field">
            <span>Heslo</span>
            <input name="password" type="password" required />
          </label>
          <button className="button button-primary">
            <span className="material-icons">key</span>
            Odemknout
          </button>
        </form>
      </section>
    </main>
  )
}

export default function EmbedPage({
  embed,
  requiresPassword,
  slug,
  error,
  lockedTitle,
  lockedDescription,
}) {
  const iframeRef = useRef(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (requiresPassword || !embed) return

    const showTimer = setTimeout(() => {
      if (!hasLoaded) setShowFallback(true)
    }, 2000)

    const hideTimer = setTimeout(() => {
      setShowFallback(false)
    }, 4000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [embed, hasLoaded, requiresPassword])

  // 🔒 blokace pokusů o otevření nového okna (best effort)
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'A') {
        e.preventDefault()
      }
    }

    window.addEventListener('click', handler, true)
    return () => window.removeEventListener('click', handler, true)
  }, [])

  if (!embed) {
    return (
      <>
        <PublicHead title="Nenalezeno" />
        <main className="shell shell-home">
          <section className="panel centered-panel">
            <h1>Stránka neexistuje</h1>
            <Link href="/">Zpět</Link>
          </section>
        </main>
      </>
    )
  }

  if (requiresPassword) {
    return (
      <>
        <PublicHead title={slug} />
        <ProtectedPage
          slug={slug}
          error={error}
          title={lockedTitle}
          description={lockedDescription}
        />
      </>
    )
  }

  return (
    <>
      <PublicHead title={embed.slug} />

      <main className="embed-page">
        <div className="embed-frame-shell">
          <iframe
            ref={iframeRef}
            className="embed-frame"
            src={embed.url}
            title={embed.slug}
            loading="eager"
            scrolling="yes"

            /* 🔥 KLÍČOVÁ ČÁST */
            sandbox="
              allow-scripts
              allow-same-origin
              allow-forms
            "

            onLoad={() => {
              setHasLoaded(true)
              setShowFallback(false)
            }}
          />

          {/* badge */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              pointerEvents: 'none',
            }}
          >
            <div className="embed-display-guard__badge">
              <span className="material-icons">visibility</span>
              Zobrazovací režim
            </div>
          </div>
        </div>

        {showFallback && (
          <div className="embed-fallback">
            <span>
              Pokud se stránka nezobrazí správně, otevři ji přímo.
            </span>
            <a href={embed.url} target="_blank">
              Otevřít
            </a>
          </div>
        )}
      </main>
    </>
  )
}

export async function getServerSideProps({ params, req, res, query }) {
  res.setHeader('Cache-Control', 'no-store')

  const embed = await getEmbedBySlug(params.slug, { includeSecrets: true })

  if (!embed) res.statusCode = 404

  const requiresPassword =
    Boolean(embed?.passwordHash) && !hasLinkAccess(req, embed.slug)

  const error = Array.isArray(query.error) ? query.error[0] : query.error || ''

  if (embed && !requiresPassword) {
    await incrementEmbedView(embed.slug)
  }

  if (embed?.passwordHash) delete embed.passwordHash

  return {
    props: {
      embed,
      slug: params.slug,
      requiresPassword,
      error,
      lockedTitle: 'Odkaz je pod heslem',
      lockedDescription: 'Zadej heslo pro pokračování',
    },
  }
}