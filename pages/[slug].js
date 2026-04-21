import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getEmbedBySlug } from '../lib/store'

export default function EmbedPage({ embed }) {
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShowFallback(true)
    }, 3200)

    return () => window.clearTimeout(timeout)
  }, [])

  if (!embed) {
    return (
      <>
        <Head>
          <title>Odkaz nenalezen | Ofiko Poradatel</title>
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

  return (
    <>
      <Head>
        <title>{embed.slug} | Ofiko Poradatel</title>
      </Head>

      <main className="embed-page">
        <iframe
          className="embed-frame"
          src={embed.url}
          title={embed.slug}
          allow="clipboard-read; clipboard-write"
          loading="eager"
          onLoad={() => setShowFallback(false)}
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

export async function getServerSideProps({ params, res }) {
  const embed = await getEmbedBySlug(params.slug)

  if (!embed) {
    res.statusCode = 404
  }

  return {
    props: {
      embed,
    },
  }
}
