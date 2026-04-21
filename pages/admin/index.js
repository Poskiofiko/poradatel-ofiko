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

function ArchiveSection({ title, items, baseUrl, archived }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{archived ? 'Archivovane odkazy' : 'Aktivni odkazy'}</p>
          <h2>{title}</h2>
        </div>
        <span className="badge">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="muted">
          {archived
            ? 'Archiv je zatim prazdny.'
            : 'Zatim tu neni zadny ulozeny embed.'}
        </p>
      ) : (
        <div className="embed-list">
          {items.map((embed) => (
            <article className="embed-item" key={embed.slug}>
              <div className="embed-meta">
                <p className="embed-label">Verejna adresa</p>
                <Link href={`/${embed.slug}`}>{`${baseUrl}/${embed.slug}`}</Link>
                <p className="embed-flag">
                  {embed.passwordProtected ? 'Chraneno heslem' : 'Bez hesla'}
                </p>
                {embed.archived ? (
                  <p className="embed-flag embed-flag--muted">Archivovano</p>
                ) : null}
                <p className="embed-label">Cilova URL</p>
                <p>{embed.url}</p>
              </div>

              <div className="embed-actions">
                <Link
                  className="button button-secondary"
                  href={`/admin?slug=${encodeURIComponent(embed.slug)}&url=${encodeURIComponent(embed.url)}&protected=${embed.passwordProtected ? '1' : '0'}`}
                >
                  Upravit
                </Link>

                <form method="post" action="/api/admin/archive">
                  <input type="hidden" name="slug" value={embed.slug} />
                  <input
                    type="hidden"
                    name="archived"
                    value={archived ? '0' : '1'}
                  />
                  <button className="button button-secondary" type="submit">
                    {archived ? 'Obnovit' : 'Archivovat'}
                  </button>
                </form>

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
  )
}

function DashboardView({
  embeds,
  message,
  error,
  baseUrl,
  initialSlug,
  initialUrl,
  initialProtected,
}) {
  const activeEmbeds = embeds.filter((embed) => !embed.archived)
  const archivedEmbeds = embeds.filter((embed) => embed.archived)

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

          <label className="field">
            <span>Heslo pro odkaz</span>
            <input
              name="password"
              type="text"
              placeholder={
                initialProtected
                  ? 'Ponech prazdne pro zachovani, nebo napis nove heslo'
                  : 'Volitelne - kdyz vyplnis, odkaz bude chraneny heslem'
              }
            />
          </label>

          <label className="field field-inline">
            <input name="removePassword" type="checkbox" value="on" />
            <span>Odebrat heslo z tohoto odkazu</span>
          </label>

          <button className="button button-primary" type="submit">
            Ulozit embed
          </button>
        </form>
      </div>

      <div className="admin-side">
        <ArchiveSection
          title="Slug seznam"
          items={activeEmbeds}
          baseUrl={baseUrl}
          archived={false}
        />
        <ArchiveSection
          title="Odlozene linky"
          items={archivedEmbeds}
          baseUrl={baseUrl}
          archived
        />
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
  initialProtected,
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
            initialProtected={initialProtected}
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
  const initialProtected =
    (Array.isArray(query.protected) ? query.protected[0] : query.protected || '') ===
    '1'
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
        initialProtected: false,
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
      initialProtected,
    },
  }
}
