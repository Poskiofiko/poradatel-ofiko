import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

import { getBaseUrlFromRequest } from '../../lib/config'
import { getSessionFromRequest } from '../../lib/auth'
import { listEmbeds } from '../../lib/store'

function formatDate(value) {
  if (!value) {
    return 'Neznamy cas'
  }

  return new Date(value).toLocaleString('cs-CZ')
}

function LoginView({ error }) {
  return (
    <section className="panel auth-panel">
      <div>
        <p className="eyebrow">Admin login</p>
        <h1>Poradatel admin</h1>
        <p className="muted">
          Prihlas se admin uctem a spravuj verejne odkazy, archiv i ochranu heslem.
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

function SummaryCard({ label, value, tone = 'default' }) {
  return (
    <article className={`summary-card summary-card--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button className="button button-ghost" type="button" onClick={handleClick}>
      {copied ? 'Zkopirovano' : label}
    </button>
  )
}

function Badge({ children, tone = 'default' }) {
  return <span className={`embed-flag embed-flag--${tone}`}>{children}</span>
}

function RecordCard({ embed, baseUrl, selected, onToggleSelect, currentView }) {
  const publicUrl = `${baseUrl}/${embed.slug}`
  const confirmDelete =
    'Opravdu chces tenhle odkaz smazat? Tohle nejde vratit zpet.'
  const confirmArchive = embed.archived
    ? 'Obnovit tenhle odkaz z archivu?'
    : 'Presunout tenhle odkaz do archivu?'
  const confirmEnable = embed.isEnabled
    ? 'Docasne vypnout tenhle odkaz?'
    : 'Znovu povolit tenhle odkaz?'

  return (
    <article className={`record-card ${selected ? 'record-card--selected' : ''}`}>
      <div className="record-select">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(embed.slug)}
          aria-label={`Vybrat ${embed.slug}`}
        />
      </div>

      <div className="record-main">
        <div className="record-top">
          <div>
            <p className="embed-label">Verejna adresa</p>
            <Link className="record-url" href={`/${embed.slug}`}>
              {publicUrl}
            </Link>
            <div className="record-badges">
              <Badge tone={embed.passwordProtected ? 'brand' : 'muted'}>
                {embed.passwordProtected ? 'Chraneno heslem' : 'Bez hesla'}
              </Badge>
              <Badge tone={embed.archived ? 'muted' : 'success'}>
                {embed.archived ? 'Archivovano' : 'Aktivni'}
              </Badge>
              <Badge tone={embed.isEnabled ? 'success' : 'warning'}>
                {embed.isEnabled ? 'Povoleno' : 'Vypnuto'}
              </Badge>
              {embed.expiresAt ? (
                <Badge
                  tone={
                    new Date(embed.expiresAt).getTime() < Date.now()
                      ? 'danger'
                      : 'muted'
                  }
                >
                  {new Date(embed.expiresAt).getTime() < Date.now()
                    ? 'Expirovano'
                    : `Expirace ${new Date(embed.expiresAt).toLocaleDateString('cs-CZ')}`}
                </Badge>
              ) : null}
              {embed.category ? <Badge tone="default">{embed.category}</Badge> : null}
            </div>
          </div>

          <div className="record-quick-actions">
            <CopyButton value={publicUrl} label="Kopirovat verejnou URL" />
            <CopyButton value={embed.url} label="Kopirovat cilovou URL" />
          </div>
        </div>

        <div className="record-grid">
          <div>
            <p className="embed-label">Cilova URL</p>
            <p className="record-muted">{embed.url}</p>
          </div>
          <div>
            <p className="embed-label">Statistiky</p>
            <p className="record-muted">
              Otevreni: <strong>{embed.viewCount}</strong>
            </p>
            <p className="record-muted">Naposledy otevreno: {formatDate(embed.lastViewedAt)}</p>
          </div>
          <div>
            <p className="embed-label">Cas</p>
            <p className="record-muted">Vytvoreno: {formatDate(embed.createdAt)}</p>
            <p className="record-muted">Upraveno: {formatDate(embed.updatedAt)}</p>
          </div>
          <div>
            <p className="embed-label">Tagy</p>
            <div className="tag-row">
              {embed.tags.length > 0 ? (
                embed.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="record-muted">Bez tagu</span>
              )}
            </div>
          </div>
        </div>

        {embed.note ? (
          <div className="record-note">
            <p className="embed-label">Poznamka</p>
            <p className="record-muted">{embed.note}</p>
          </div>
        ) : null}

        {embed.auditLog?.length > 0 ? (
          <div className="record-audit">
            <p className="embed-label">Posledni zmeny</p>
            <div className="audit-list">
              {embed.auditLog.slice(0, 3).map((entry) => (
                <p className="record-muted" key={`${entry.at}-${entry.action}`}>
                  <strong>{entry.action}</strong> · {formatDate(entry.at)} · {entry.detail}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="record-actions">
          <Link
            className="button button-secondary"
            href={`/admin?slug=${encodeURIComponent(embed.slug)}&url=${encodeURIComponent(
              embed.url
            )}&protected=${embed.passwordProtected ? '1' : '0'}&category=${encodeURIComponent(
              embed.category || ''
            )}&note=${encodeURIComponent(embed.note || '')}&tags=${encodeURIComponent(
              embed.tags.join(', ')
            )}&expiresAt=${encodeURIComponent(embed.expiresAt || '')}&enabled=${
              embed.isEnabled ? '1' : '0'
            }`}
          >
            Upravit
          </Link>

          <form method="post" action="/api/admin/duplicate">
            <input type="hidden" name="slug" value={embed.slug} />
            <input type="hidden" name="view" value={currentView} />
            <button className="button button-secondary" type="submit">
              Duplikovat
            </button>
          </form>

          <a className="button button-secondary" href={publicUrl} target="_blank" rel="noreferrer">
            Nahled
          </a>

          <a className="button button-secondary" href={embed.url} target="_blank" rel="noreferrer">
            Otevrit cil
          </a>

          <form method="post" action="/api/admin/archive">
            <input type="hidden" name="slug" value={embed.slug} />
            <input type="hidden" name="archived" value={embed.archived ? '0' : '1'} />
            <input type="hidden" name="view" value={currentView} />
            <button
              className="button button-secondary"
              type="submit"
              onClick={(event) => {
                if (!window.confirm(confirmArchive)) {
                  event.preventDefault()
                }
              }}
            >
              {embed.archived ? 'Obnovit' : 'Archivovat'}
            </button>
          </form>

          <form method="post" action="/api/admin/toggle">
            <input type="hidden" name="slug" value={embed.slug} />
            <input type="hidden" name="isEnabled" value={embed.isEnabled ? '0' : '1'} />
            <input type="hidden" name="view" value={currentView} />
            <button
              className="button button-secondary"
              type="submit"
              onClick={(event) => {
                if (!window.confirm(confirmEnable)) {
                  event.preventDefault()
                }
              }}
            >
              {embed.isEnabled ? 'Vypnout' : 'Zapnout'}
            </button>
          </form>

          <form method="post" action="/api/admin/delete">
            <input type="hidden" name="slug" value={embed.slug} />
            <input type="hidden" name="view" value={currentView} />
            <button
              className="button button-danger"
              type="submit"
              onClick={(event) => {
                if (!window.confirm(confirmDelete)) {
                  event.preventDefault()
                }
              }}
            >
              Smazat
            </button>
          </form>
        </div>
      </div>
    </article>
  )
}

function BulkBar({ selectedSlugs, activeView }) {
  if (selectedSlugs.length === 0) {
    return null
  }

  return (
    <form className="bulk-bar panel" method="post" action="/api/admin/bulk">
      {selectedSlugs.map((slug) => (
        <input key={slug} type="hidden" name="slug" value={slug} />
      ))}
      <p>
        Vybrano <strong>{selectedSlugs.length}</strong> odkazu
      </p>
      <div className="bulk-actions">
        <button className="button button-secondary" type="submit" name="action" value="archive">
          Archivovat
        </button>
        <button className="button button-secondary" type="submit" name="action" value="restore">
          Obnovit
        </button>
        <button className="button button-secondary" type="submit" name="action" value="enable">
          Zapnout
        </button>
        <button className="button button-secondary" type="submit" name="action" value="disable">
          Vypnout
        </button>
        <button
          className="button button-danger"
          type="submit"
          name="action"
          value="delete"
          onClick={(event) => {
            if (!window.confirm('Opravdu chces hromadne smazat vybrane odkazy?')) {
              event.preventDefault()
            }
          }}
        >
          Smazat
        </button>
      </div>
      <input type="hidden" name="view" value={activeView} />
    </form>
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
  initialCategory,
  initialNote,
  initialTags,
  initialExpiresAt,
  initialEnabled,
  initialView,
}) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState(initialView)
  const [sortBy, setSortBy] = useState('updated-desc')
  const [selectedSlugs, setSelectedSlugs] = useState([])

  const summary = {
    total: embeds.length,
    active: embeds.filter((embed) => !embed.archived).length,
    archived: embeds.filter((embed) => embed.archived).length,
    protected: embeds.filter((embed) => embed.passwordProtected).length,
    disabled: embeds.filter((embed) => !embed.isEnabled).length,
    expired: embeds.filter(
      (embed) => embed.expiresAt && new Date(embed.expiresAt).getTime() < Date.now()
    ).length,
  }

  let filtered = embeds.filter((embed) => {
    if (view === 'active' && embed.archived) {
      return false
    }
    if (view === 'archived' && !embed.archived) {
      return false
    }
    if (view === 'protected' && !embed.passwordProtected) {
      return false
    }
    if (view === 'disabled' && embed.isEnabled) {
      return false
    }

    const haystack = [
      embed.slug,
      embed.url,
      embed.category,
      embed.note,
      embed.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query.trim().toLowerCase())
  })

  filtered = [...filtered].sort((left, right) => {
    if (sortBy === 'name-asc') {
      return left.slug.localeCompare(right.slug)
    }
    if (sortBy === 'name-desc') {
      return right.slug.localeCompare(left.slug)
    }
    if (sortBy === 'created-desc') {
      return new Date(right.createdAt) - new Date(left.createdAt)
    }
    if (sortBy === 'views-desc') {
      return right.viewCount - left.viewCount
    }

    return new Date(right.updatedAt) - new Date(left.updatedAt)
  })

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((embed) => selectedSlugs.includes(embed.slug))

  function toggleSelect(slug) {
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    )
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedSlugs((current) =>
        current.filter((slug) => !filtered.some((embed) => embed.slug === slug))
      )
      return
    }

    setSelectedSlugs((current) => [
      ...new Set([...current, ...filtered.map((embed) => embed.slug)]),
    ])
  }

  return (
    <section className="dashboard-shell">
      <div className="dashboard-top panel">
        <div>
          <p className="eyebrow">Ofiko Poradatel</p>
          <h1>Dashboard odkazu</h1>
          <p className="muted">
            Rychla sprava aktivnich odkazu, archivu, hesel, statistik a metadat na jednom miste.
          </p>
        </div>

        <div className="dashboard-top-actions">
          <a className="button button-secondary" href="/api/admin/export">
            Export CSV
          </a>
          <form method="post" action="/api/admin/logout">
            <button className="button button-secondary" type="submit">
              Odhlasit
            </button>
          </form>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard label="Celkem odkazu" value={summary.total} />
        <SummaryCard label="Aktivni" value={summary.active} tone="success" />
        <SummaryCard label="Archiv" value={summary.archived} tone="muted" />
        <SummaryCard label="Chranene heslem" value={summary.protected} tone="brand" />
        <SummaryCard label="Vypnute" value={summary.disabled} tone="warning" />
        <SummaryCard label="Expirovane" value={summary.expired} tone="danger" />
      </div>

      <BulkBar selectedSlugs={selectedSlugs} activeView={view} />

      <div className="admin-layout admin-layout--wide">
        <div className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Editor odkazu</p>
              <h2>{initialSlug ? 'Uprava zaznamu' : 'Novy odkaz'}</h2>
            </div>
          </div>

          {message ? <p className="success-box">{message}</p> : null}
          {error ? <p className="error-box">{error}</p> : null}

          <form className="stack" method="post" action="/api/admin/embeds">
            <input type="hidden" name="view" value={view} />
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

            <div className="form-grid">
              <label className="field">
                <span>Kategorie</span>
                <input
                  name="category"
                  type="text"
                  placeholder="festival, registrace, test"
                  defaultValue={initialCategory}
                />
              </label>

              <label className="field">
                <span>Tagy</span>
                <input
                  name="tags"
                  type="text"
                  placeholder="praha, 2026, vip"
                  defaultValue={initialTags}
                />
              </label>
            </div>

            <label className="field">
              <span>Poznamka</span>
              <textarea
                name="note"
                rows="3"
                placeholder="Interni poznamka k odkazu"
                defaultValue={initialNote}
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Expirace</span>
                <input name="expiresAt" type="date" defaultValue={initialExpiresAt} />
              </label>

              <label className="field">
                <span>Stav odkazu</span>
                <select name="isEnabled" defaultValue={initialEnabled ? 'on' : 'off'}>
                  <option value="on">Povoleny</option>
                  <option value="off">Vypnuty</option>
                </select>
              </label>
            </div>

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
              Ulozit odkaz
            </button>
          </form>
        </div>

        <div className="admin-side">
          <div className="panel toolbar-panel">
            <div className="toolbar-row">
              <label className="field">
                <span>Hledani</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="slug, URL, tag, poznamka..."
                />
              </label>

              <label className="field">
                <span>Zobrazeni</span>
                <select value={view} onChange={(event) => setView(event.target.value)}>
                  <option value="active">Aktivni</option>
                  <option value="archived">Archiv</option>
                  <option value="all">Vse</option>
                  <option value="protected">Jen chranene</option>
                  <option value="disabled">Jen vypnute</option>
                </select>
              </label>

              <label className="field">
                <span>Seradit</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="updated-desc">Naposledy upravene</option>
                  <option value="created-desc">Nove vytvorene</option>
                  <option value="name-asc">Slug A-Z</option>
                  <option value="name-desc">Slug Z-A</option>
                  <option value="views-desc">Nejvic otevrene</option>
                </select>
              </label>
            </div>

            <div className="toolbar-row toolbar-row--compact">
              <button className="button button-secondary" type="button" onClick={toggleSelectAll}>
                {allVisibleSelected ? 'Odebrat vyber' : 'Vybrat vse viditelne'}
              </button>
              <p className="muted">
                Zobrazeno <strong>{filtered.length}</strong> z <strong>{embeds.length}</strong> odkazu
              </p>
            </div>
          </div>

          <div className="records-column">
            {filtered.length === 0 ? (
              <section className="panel empty-state">
                <p className="eyebrow">Prazdny vysledek</p>
                <h2>Nenasel jsem zadne odkazy</h2>
                <p className="muted">
                  Zkus zmenit filtr, hledani nebo vytvor novy zaznam vlevo v editoru.
                </p>
              </section>
            ) : (
              filtered.map((embed) => (
                <RecordCard
                  key={embed.slug}
                  embed={embed}
                  baseUrl={baseUrl}
                  selected={selectedSlugs.includes(embed.slug)}
                  onToggleSelect={toggleSelect}
                  currentView={view}
                />
              ))
            )}
          </div>
        </div>
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
  initialCategory,
  initialNote,
  initialTags,
  initialExpiresAt,
  initialEnabled,
  initialView,
}) {
  return (
    <>
      <Head>
        <title>Admin | Poradatel</title>
        <meta
          name="robots"
          content="noindex,nofollow,noarchive,nosnippet,noimageindex"
        />
      </Head>

      <main className="shell shell-admin">
        {authenticated ? (
          <DashboardView
            embeds={embeds}
            error={error}
            message={message}
            baseUrl={baseUrl}
            initialSlug={initialSlug}
            initialUrl={initialUrl}
            initialProtected={initialProtected}
            initialCategory={initialCategory}
            initialNote={initialNote}
            initialTags={initialTags}
            initialExpiresAt={initialExpiresAt}
            initialEnabled={initialEnabled}
            initialView={initialView}
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
  const message = Array.isArray(query.message) ? query.message[0] : query.message || ''
  const initialSlug = Array.isArray(query.slug) ? query.slug[0] : query.slug || ''
  const initialUrl = Array.isArray(query.url) ? query.url[0] : query.url || ''
  const initialProtected =
    (Array.isArray(query.protected) ? query.protected[0] : query.protected || '') ===
    '1'
  const initialCategory =
    Array.isArray(query.category) ? query.category[0] : query.category || ''
  const initialNote = Array.isArray(query.note) ? query.note[0] : query.note || ''
  const initialTags = Array.isArray(query.tags) ? query.tags[0] : query.tags || ''
  const initialExpiresAt =
    Array.isArray(query.expiresAt) ? query.expiresAt[0] : query.expiresAt || ''
  const initialEnabled =
    (Array.isArray(query.enabled) ? query.enabled[0] : query.enabled || '1') === '1'
  const initialView = Array.isArray(query.view) ? query.view[0] : query.view || 'active'
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
        initialCategory: '',
        initialNote: '',
        initialTags: '',
        initialExpiresAt: '',
        initialEnabled: true,
        initialView: 'active',
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
      initialCategory,
      initialNote,
      initialTags,
      initialExpiresAt,
      initialEnabled,
      initialView,
    },
  }
}
