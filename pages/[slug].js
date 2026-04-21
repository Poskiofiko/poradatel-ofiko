import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
      <link
        rel="stylesheet"
        href="https://cdn.levitio.com/fonts/silka/roman/stylesheet.css"
      />
      <link
        rel="stylesheet"
        href="https://cdn.levitio.com/fonts/silka/italic/stylesheet.css"
      />
      <meta
        name="robots"
        content="noindex,nofollow,noarchive,nosnippet,noimageindex"
      />
    </Head>
  )
}

function ProtectedPage({ slug, error, title, description }) {
  return (
    <main className="shell shell-home public-home public-lock-shell">
      <section className="panel centered-panel public-panel public-empty public-lock-panel">
        <div className="public-lock-icon" aria-hidden="true">
          <span className="material-icons">lock</span>
        </div>
        <p className="eyebrow">Chraneny odkaz</p>
        <h1>{title}</h1>
        <p className="muted public-lock-copy">{description}</p>
        {error ? <p className="error-box">{error}</p> : null}
        <form className="stack protected-form" method="post" action="/api/access">
          <input type="hidden" name="slug" value={slug} />
          <label className="field">
            <span>Heslo</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button button-primary" type="submit">
            <span className="material-icons button-inline-icon" aria-hidden="true">
              key
            </span>
            Odemknout odkaz
          </button>
        </form>
        <p className="public-lock-footnote">
          Odkaz je dostupny pouze pro lidi, kteri maji spravne heslo.
        </p>
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
        <PublicHead title="Odkaz nenalezen | Ofiko Poradatel" />

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
        <PublicHead title={`${slug} | Ofiko Poradatel`} />
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
      <PublicHead title={`${embed.slug} | Ofiko Poradatel`} />

      <main className="embed-page">
        <div className={`embed-frame-shell ${embed.renderMode === 'display' ? 'embed-frame-shell--display' : ''}`}>
          <iframe
            className={`embed-frame ${embed.renderMode === 'display' ? 'embed-frame--display' : ''}`}
            src={embed.url}
            title={embed.slug}
            allow="clipboard-read; clipboard-write"
            sandbox={
              embed.renderMode === 'display'
                ? 'allow-same-origin allow-scripts'
                : undefined
            }
            loading="eager"
            onLoad={() => {
              setHasLoaded(true)
              setShowFallback(false)
            }}
          />
          {embed.renderMode === 'display' ? (
            <div className="embed-display-guard" aria-hidden="true">
              <div className="embed-display-guard__badge">
                <span className="material-icons">visibility</span>
                Zobrazovaci rezim
              </div>
            </div>
          ) : null}
        </div>

        {showFallback ? (
          <div className="embed-fallback">
            <span>
              {embed.renderMode === 'display'
                ? 'Zobrazovaci rezim omezuje interakce uvnitr stranky. Kdyz se embed nezobrazi spravne, otevri cilovou stranku primo.'
                : 'Pokud se embed nezobrazi, otevri cilovou stranku primo.'}
            </span>
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
  const isExpired =
    Boolean(embed?.expiresAt) && new Date(embed.expiresAt).getTime() < Date.now()
  const isDisabled = embed?.isEnabled === false

  if (embed && !requiresPassword && !isExpired && !isDisabled) {
    await incrementEmbedView(embed.slug)
  }

  let lockedTitle = 'Tenhle odkaz je pod heslem'
  let lockedDescription =
    'Zadej heslo, ktere jsi dostal s odkazem. Po spravnem zadani se stranka otevre.'

  if (isDisabled) {
    lockedTitle = 'Tenhle odkaz je docasne vypnuty'
    lockedDescription =
      'Organizator ho docasne vypnul. Pokud ho potrebujes otevrit, pozadej o novou aktivni adresu.'
  } else if (isExpired) {
    lockedTitle = 'Tenhle odkaz uz expiroval'
    lockedDescription =
      'Platnost odkazu skoncila. Pokud ho potrebujes znovu, pozadej o novou aktualni adresu.'
  }

  if (embed?.passwordHash) {
    delete embed.passwordHash
  }

  return {
    props: {
      embed,
      slug,
      requiresPassword: requiresPassword || isDisabled || isExpired,
      error,
      lockedTitle,
      lockedDescription,
    },
  }
}
