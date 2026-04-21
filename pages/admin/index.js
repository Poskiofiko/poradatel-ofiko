import Head from 'next/head'
import Link from 'next/link'

import { getBaseUrlFromRequest } from '../../lib/config'
import { getSessionFromRequest } from '../../lib/auth'
import { listEmbeds } from '../../lib/store'

function LoginView({ error }) {
  return (
    <section className="panel auth-panel">
      <div>
        <p className="eyebrow">Admin login</p>
        <h1>Poradatel admin</h1>
        <p className="muted">
          Prihlas se admin uctem a pridej novy slug nebo uprav existujici embed.
        </p>
      </div>

      {error ? <p className="error-box">{error}</p> : null}

      <form className="stack" method="post" action="/api/admin/login">
        <label className="field">
          <span>Uzivatelske jmeno</span>
          <input name="username" type="text" autoComplete="username" required />
        </label>

        <label className="field">
          <span>Heslo</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="button button-primary" type="submit">
          Prihlasit se
        </button>
      </form>
    </section>
  )
}

function DashboardView({ embeds, message, error, baseUrl, initialSlug, initialUrl }) {
  return (
    <section className="admin-layout">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sprava embedu</p>
            <h1>Nova zkratka</h1>
          </div>
          <form method="post" action="/api/admin/logout">
            <button className="button button-secondary" type="submit">
              Odhlasit
            </button>
          </form>
        </div>

        <p className="muted">
          Zadej URL a slug. Stranka pak bude dostupna na
          {' '}
          <code>poradatel.ofiko.eu/tvuj-slug</code>.
        </p>

        {message ? <p className="success-box">{message}</p> : null}
        {error ? <p className="error-box">{error}</p> : null}

        <form className="stack" method="post" action="/api/admin/embeds">
          <label className="field">
            <span>Slug</span>
            <input
              name="slug"
              type="text"
              placeholder="sobotalibcice"
              pattern="[a-z0-9-]+"
              defaultValue={initialSlug}
              required
            />
          </label>

          <label className="field">
            <span>Cilova URL</span>
            <textarea
              name="url"
              rows="4"
              placeholder="https://public.levitio.com/events/..."
              defaultValue={initialUrl}
              required
            />
          </label>

          <button className="button button-primary" type="submit">
            Ulozit embed
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Aktivni odkazy</p>
            <h2>Slug seznam</h2>
          </div>
          <span className="badge">{embeds.length}</span>
        </div>

        {embeds.length === 0 ? (
          <p className="muted">Zatim tu neni zadny ulozeny embed.</p>
        ) : (
          <div className="embed-list">
            {embeds.map((embed) => (
              <article className="embed-item" key={embed.slug}>
                <div className="embed-meta">
                  <p className="embed-label">Verejna adresa</p>
                  <Link href={`/${embed.slug}`}>{`${baseUrl}/${embed.slug}`}</Link>
                  <p className="embed-label">Cilova URL</p>
                  <p>{embed.url}</p>
                </div>

                <div className="embed-actions">
                  <Link
                    className="button button-secondary"
                    href={`/admin?slug=${encodeURIComponent(embed.slug)}&url=${encodeURIComponent(embed.url)}`}
                  >
                    Upravit
                  </Link>

                  <form method="post" action="/api/admin/delete">
                    <input type="hidden" name="slug" value={embed.slug} />
                    <button className="button button-danger" type="submit">
                      Smazat
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function AdminPage({
  authenticated,
  embeds,
  error,
  message,
  baseUrl,
  initialSlug,
  initialUrl,
}) {
  return (
    <>
      <Head>
        <title>Admin | Poradatel</title>
        <meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex" />
      </Head>

      <main className="shell">
        {authenticated ? (
          <DashboardView
            embeds={embeds}
            error={error}
            message={message}
            baseUrl={baseUrl}
            initialSlug={initialSlug}
            initialUrl={initialUrl}
          />
        ) : (
          <LoginView error={error} />
        )}
      </main>
    </>
  )
}

export async function getServerSideProps({ req, res, query }) {
  res.setHeader(
    'Cache-Control',
    'private, no-store, no-cache, max-age=0, must-revalidate'
  )

  const session = getSessionFromRequest(req)
  const error = Array.isArray(query.error) ? query.error[0] : query.error || ''
  const message = Array.isArray(query.message)
    ? query.message[0]
    : query.message || ''
  const initialSlug = Array.isArray(query.slug) ? query.slug[0] : query.slug || ''
  const initialUrl = Array.isArray(query.url) ? query.url[0] : query.url || ''
  const baseUrl = getBaseUrlFromRequest(req)

  if (!session) {
    return {
      props: {
        authenticated: false,
        embeds: [],
        error,
        message: '',
        baseUrl,
        initialSlug: '',
        initialUrl: '',
      },
    }
  }

  return {
    props: {
      authenticated: true,
      embeds: await listEmbeds(),
      error,
      message,
      baseUrl,
      initialSlug,
      initialUrl,
    },
  }
}
