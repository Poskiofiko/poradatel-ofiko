import Head from 'next/head'
import Link from 'next/link'

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

function DashboardView({ embeds, message, error }) {
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
              required
            />
          </label>

          <label className="field">
            <span>Cilova URL</span>
            <textarea
              name="url"
              rows="4"
              placeholder="https://public.levitio.com/events/..."
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
                  <Link href={`/${embed.slug}`}>/{embed.slug}</Link>
                  <p>{embed.url}</p>
                </div>

                <form method="post" action="/api/admin/delete">
                  <input type="hidden" name="slug" value={embed.slug} />
                  <button className="button button-danger" type="submit">
                    Smazat
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function AdminPage({ authenticated, embeds, error, message }) {
  return (
    <>
      <Head>
        <title>Admin | Poradatel</title>
      </Head>

      <main className="shell">
        {authenticated ? (
          <DashboardView embeds={embeds} error={error} message={message} />
        ) : (
          <LoginView error={error} />
        )}
      </main>
    </>
  )
}

export async function getServerSideProps({ req, query }) {
  const session = getSessionFromRequest(req)
  const error = Array.isArray(query.error) ? query.error[0] : query.error || ''
  const message = Array.isArray(query.message)
    ? query.message[0]
    : query.message || ''

  if (!session) {
    return {
      props: {
        authenticated: false,
        embeds: [],
        error,
        message: '',
      },
    }
  }

  return {
    props: {
      authenticated: true,
      embeds: await listEmbeds(),
      error,
      message,
    },
  }
}
