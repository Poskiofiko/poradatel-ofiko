import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getBaseUrlFromRequest } from '../../lib/config'
import { getSessionFromRequest } from '../../lib/auth'
import { listEmbeds } from '../../lib/store'

function AdminIcon({ name, className = '' }) {
  return <span className={`material-icons ${className}`.trim()} aria-hidden="true">{name}</span>
}

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

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast toast--${toast.type}`}>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)}>
            Zavrit
          </button>
        </article>
      ))}
    </div>
  )
}

function ActivityBanner({ text, detail, tone = 'idle' }) {
  return (
    <section className={`activity-banner activity-banner--${tone}`}>
      <div className="activity-dot" />
      <div>
        <strong>{text}</strong>
        <p>{detail}</p>
      </div>
    </section>
  )
}

function SideNav({ summary, activeView, onSelectView }) {
  const items = [
    { id: 'all', label: 'Dashboard', count: summary.total, icon: 'dashboard' },
    { id: 'active', label: 'Odkazy', count: summary.active, icon: 'link' },
    { id: 'archived', label: 'Archiv', count: summary.archived, icon: 'inventory_2' },
    { id: 'protected', label: 'Chranene', count: summary.protected, icon: 'lock' },
    { id: 'disabled', label: 'Vypnute', count: summary.disabled, icon: 'visibility_off' },
    { id: 'all', label: 'Aktivita', count: null, icon: 'history' },
  ]

  return (
    <aside className="admin-sidebar panel">
      <div className="admin-sidebar__brand">
        <p className="eyebrow">Open Admin</p>
        <h2>Ofiko Panel</h2>
        <p className="muted">Sprava verejnych odkazu, pristupu a stavu embedu.</p>
      </div>

      <div className="admin-sidebar__search">
        <input
          type="search"
          value="Ofiko Control Suite"
          readOnly
          aria-label="Navigace"
        />
      </div>

      <nav className="admin-sidebar__nav" aria-label="Admin navigace">
        {items.map((item) => (
          <button
            key={`${item.label}-${item.id}`}
            type="button"
            className={`admin-nav-item ${activeView === item.id ? 'admin-nav-item--active' : ''}`}
            onClick={() => onSelectView(item.id)}
          >
            <AdminIcon name={item.icon} className="admin-nav-item__icon" />
            <span>{item.label}</span>
            {item.count !== null ? (
              <span className="admin-nav-item__count">{item.count}</span>
            ) : null}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const current = document.documentElement.dataset.theme || 'light'
    setTheme(current)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('ofiko-theme', next)
  }

  return (
    <button className="button button-secondary" type="button" onClick={toggleTheme}>
      <AdminIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="button-icon" />
      {theme === 'dark' ? 'Svetly rezim' : 'Tmavy rezim'}
    </button>
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

function RecordCard({
  embed,
  baseUrl,
  selected,
  onToggleSelect,
  currentView,
  onAction,
  pendingAction,
}) {
  const publicUrl = `${baseUrl}/${embed.slug}`
  const confirmDelete =
    'Opravdu chces tenhle odkaz smazat? Tohle nejde vratit zpet.'
  const confirmArchive = embed.archived
    ? 'Obnovit tenhle odkaz z archivu?'
    : 'Presunout tenhle odkaz do archivu?'
  const confirmEnable = embed.isEnabled
    ? 'Docasne vypnout tenhle odkaz?'
    : 'Znovu povolit tenhle odkaz?'
  const isBusy = Boolean(pendingAction)

  async function runAction(actionName, payload, confirmation) {
    if (confirmation && !window.confirm(confirmation)) {
      return
    }

    await onAction(embed, actionName, payload)
  }

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

          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={() => runAction('duplicate', { slug: embed.slug, view: currentView })}
          >
            {pendingAction === 'duplicate' ? 'Duplikuji...' : 'Duplikovat'}
          </button>

          <a className="button button-secondary" href={publicUrl} target="_blank" rel="noreferrer">
            Nahled
          </a>

          <a className="button button-secondary" href={embed.url} target="_blank" rel="noreferrer">
            Otevrit cil
          </a>

          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={() =>
              runAction(
                'archive',
                {
                  slug: embed.slug,
                  archived: embed.archived ? '0' : '1',
                  view: currentView,
                },
                confirmArchive
              )
            }
          >
            {pendingAction === 'archive'
              ? embed.archived
                ? 'Obnovuji...'
                : 'Archivuji...'
              : embed.archived
                ? 'Obnovit'
                : 'Archivovat'}
          </button>

          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={() =>
              runAction(
                'toggle',
                {
                  slug: embed.slug,
                  isEnabled: embed.isEnabled ? '0' : '1',
                  view: currentView,
                },
                confirmEnable
              )
            }
          >
            {pendingAction === 'toggle'
              ? embed.isEnabled
                ? 'Vypinam...'
                : 'Zapinam...'
              : embed.isEnabled
                ? 'Vypnout'
                : 'Zapnout'}
          </button>

          <button
            className="button button-danger"
            type="button"
            disabled={isBusy}
            onClick={() =>
              runAction(
                'delete',
                { slug: embed.slug, view: currentView },
                confirmDelete
              )
            }
          >
            {pendingAction === 'delete' ? 'Mazani...' : 'Smazat'}
          </button>
        </div>
      </div>
    </article>
  )
}

function BulkBar({ selectedSlugs, activeView, onBulkAction, pending }) {
  if (selectedSlugs.length === 0) {
    return null
  }

  return (
    <div className="bulk-bar panel">
      <p>
        Vybrano <strong>{selectedSlugs.length}</strong> odkazu
      </p>
      <div className="bulk-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={pending}
          onClick={() => onBulkAction('archive')}
        >
          Archivovat
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={pending}
          onClick={() => onBulkAction('restore')}
        >
          Obnovit
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={pending}
          onClick={() => onBulkAction('enable')}
        >
          Zapnout
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={pending}
          onClick={() => onBulkAction('disable')}
        >
          Vypnout
        </button>
        <button
          className="button button-danger"
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm('Opravdu chces hromadne smazat vybrane odkazy?')) {
              return
            }

            onBulkAction('delete')
          }}
        >
          {pending ? 'Provadim...' : 'Smazat'}
        </button>
      </div>
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
  initialCategory,
  initialNote,
  initialTags,
  initialExpiresAt,
  initialEnabled,
  initialView,
}) {
  const [items, setItems] = useState(embeds)
  const [query, setQuery] = useState('')
  const [view, setView] = useState(initialView)
  const [sortBy, setSortBy] = useState('updated-desc')
  const [selectedSlugs, setSelectedSlugs] = useState([])
  const [statusMessage, setStatusMessage] = useState(message)
  const [statusError, setStatusError] = useState(error)
  const [pendingMap, setPendingMap] = useState({})
  const [bulkPending, setBulkPending] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activity, setActivity] = useState({
    tone: 'idle',
    text: 'Dashboard je pripraveny',
    detail: 'Muzes hledat, upravovat, archivovat nebo vytvaret nove odkazy.',
  })
  const [progress, setProgress] = useState(0)

  const summary = {
    total: items.length,
    active: items.filter((embed) => !embed.archived).length,
    archived: items.filter((embed) => embed.archived).length,
    protected: items.filter((embed) => embed.passwordProtected).length,
    disabled: items.filter((embed) => !embed.isEnabled).length,
    expired: items.filter(
      (embed) => embed.expiresAt && new Date(embed.expiresAt).getTime() < Date.now()
    ).length,
  }

  let filtered = items.filter((embed) => {
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

  function clearFeedback() {
    setStatusMessage('')
    setStatusError('')
  }

  async function verifySavedLink(slug) {
    const startedAt = Date.now()

    while (Date.now() - startedAt < 12000) {
      const check = await fetch(`/api/admin/verify?slug=${encodeURIComponent(slug)}&_=${Date.now()}`, {
        headers: { 'x-admin-json': '1' },
        cache: 'no-store',
      })

      const publicCheck = await fetch(`/${encodeURIComponent(slug)}?_verify=${Date.now()}`, {
        cache: 'no-store',
      })

      if (check.ok && publicCheck.ok) {
        return true
      }

      await new Promise((resolve) => window.setTimeout(resolve, 900))
    }

    return false
  }

  function pushToast(type, title, message) {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, type, title, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  useEffect(() => {
    if (message) {
      pushToast('success', 'Hotovo', message)
    }
    if (error) {
      pushToast('error', 'Pozor', error)
    }
  }, [message, error])

  async function postAdminAction(url, payload) {
    const body =
      payload instanceof URLSearchParams
        ? payload
        : Object.entries(payload).reduce((params, [key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((item) => params.append(key, item))
            } else if (value !== undefined && value !== null) {
              params.append(key, value)
            }

            return params
          }, new URLSearchParams())

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'x-admin-json': '1',
      },
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Akce se nepodarila')
    }

    return data
  }

  async function handleCardAction(embed, actionName, payload) {
    clearFeedback()
    setPendingMap((current) => ({ ...current, [embed.slug]: actionName }))
    setProgress(22)
    setActivity({
      tone: 'busy',
      text: `Pracuju s odkazem ${embed.slug}`,
      detail:
        actionName === 'archive'
          ? 'Presouvam zaznam mezi aktivnimi a archivem.'
          : actionName === 'toggle'
            ? 'Menim dostupnost odkazu pro navstevniky.'
            : actionName === 'delete'
              ? 'Mazu zaznam z dashboardu.'
              : 'Vytvarim kopii odkazu se stejnym nastavenim.',
    })

    try {
      if (actionName === 'archive') {
        const data = await postAdminAction('/api/admin/archive', payload)
        setItems((current) =>
          current.map((item) =>
            item.slug === embed.slug
              ? {
                  ...item,
                  archived: data.archived,
                  archivedAt: data.archived ? new Date().toISOString() : null,
                }
              : item
          )
        )
        if (view === 'active' && data.archived) {
          setView('all')
        }
        setStatusMessage(data.message)
        pushToast('success', 'Archivace hotova', data.message)
        setProgress(100)
      } else if (actionName === 'toggle') {
        const data = await postAdminAction('/api/admin/toggle', payload)
        setItems((current) =>
          current.map((item) =>
            item.slug === embed.slug ? { ...item, isEnabled: data.isEnabled } : item
          )
        )
        setStatusMessage(data.message)
        pushToast('success', 'Stav zmenen', data.message)
        setProgress(100)
      } else if (actionName === 'delete') {
        const data = await postAdminAction('/api/admin/delete', payload)
        setItems((current) => current.filter((item) => item.slug !== data.slug))
        setSelectedSlugs((current) => current.filter((slug) => slug !== data.slug))
        setStatusMessage(data.message)
        pushToast('success', 'Zaznam smazan', data.message)
        setProgress(100)
      } else if (actionName === 'duplicate') {
        const data = await postAdminAction('/api/admin/duplicate', payload)
        setItems((current) => [...current, data.embed])
        setStatusMessage(data.message)
        pushToast('success', 'Kopie vytvorena', data.message)
        setProgress(100)
      }
    } catch (actionError) {
      setStatusError(actionError.message)
      setActivity({
        tone: 'error',
        text: 'Akce se nepovedla',
        detail: actionError.message,
      })
      pushToast('error', 'Akce selhala', actionError.message)
    } finally {
      setPendingMap((current) => {
        const next = { ...current }
        delete next[embed.slug]
        return next
      })
      setActivity({
        tone: 'idle',
        text: 'Dashboard je pripraveny',
        detail: 'Muzes pokracovat dalsi akci bez obnoveni stranky.',
      })
      window.setTimeout(() => setProgress(0), 500)
    }
  }

  async function handleBulkAction(action) {
    clearFeedback()
    setBulkPending(true)
    setProgress(18)
    setActivity({
      tone: 'busy',
      text: `Provadim hromadnou akci nad ${selectedSlugs.length} odkazy`,
      detail: 'Akce probiha na pozadi, po dokonceni se seznam prepocita bez reloadu.',
    })

    try {
      const data = await postAdminAction('/api/admin/bulk', {
        slug: selectedSlugs,
        action,
        view,
      })

      setItems((current) => {
        if (action === 'delete') {
          return current.filter((item) => !selectedSlugs.includes(item.slug))
        }

        return current.map((item) => {
          if (!selectedSlugs.includes(item.slug)) {
            return item
          }

          if (action === 'archive') {
            return { ...item, archived: true, archivedAt: new Date().toISOString() }
          }
          if (action === 'restore') {
            return { ...item, archived: false, archivedAt: null }
          }
          if (action === 'enable') {
            return { ...item, isEnabled: true }
          }
          if (action === 'disable') {
            return { ...item, isEnabled: false }
          }

          return item
        })
      })

      setSelectedSlugs([])
      setStatusMessage(data.message)
      pushToast('success', 'Hromadna akce dokoncena', data.message)
      setProgress(100)
    } catch (bulkError) {
      setStatusError(bulkError.message)
      setActivity({
        tone: 'error',
        text: 'Hromadna akce se nepovedla',
        detail: bulkError.message,
      })
      pushToast('error', 'Hromadna akce selhala', bulkError.message)
    } finally {
      setBulkPending(false)
      setActivity({
        tone: 'idle',
        text: 'Dashboard je pripraveny',
        detail: 'Vyber byl zpracovan a muzes pokracovat dal.',
      })
      window.setTimeout(() => setProgress(0), 500)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    clearFeedback()
    setSavePending(true)
    setProgress(10)
    setActivity({
      tone: 'busy',
      text: 'Ukladam zmeny formulare',
      detail:
        initialSlug || initialUrl
          ? 'Aktualizuji zaznam, kontroluji metadata a ukladam nastaveni hesla.'
          : 'Zakladam novy verejny odkaz a pripravuji ho do seznamu.',
    })

    try {
      const formData = new FormData(event.currentTarget)
      const payload = Object.fromEntries(formData.entries())
      const data = await postAdminAction('/api/admin/embeds', payload)
      setProgress(42)
      setActivity({
        tone: 'busy',
        text: 'Ulozeno do administrace, overuji verejny odkaz',
        detail:
          'Kontroluji, jestli se nova verejna adresa opravdu propsala a odpovida zvenku.',
      })

      setItems((current) => {
        const existing = current.findIndex((item) => item.slug === data.embed.slug)
        if (existing >= 0) {
          const next = [...current]
          next[existing] = { ...next[existing], ...data.embed }
          return next
        }

        return [data.embed, ...current]
      })

      setProgress(68)
      const isVerified = await verifySavedLink(data.embed.slug)
      setProgress(100)

      if (!isVerified) {
        const warningText =
          'Zaznam je ulozeny v adminu, ale verejny odkaz se zatim nepotvrdil. Pockej chvili nebo zkus otevrit nahled.'
        setStatusError(warningText)
        pushToast('error', 'Verejny odkaz zatim nepotvrzen', warningText)
        setActivity({
          tone: 'error',
          text: 'Ulozeni skoncilo, ale verejny odkaz jeste neni potvrzeny',
          detail:
            'Admin zaznam je zapsany, jen kontrola verejne adresy zatim neprosla. Muze jit o pomalejsi propsani uloziste.',
        })
        return
      }

      setStatusMessage('Odkaz byl ulozen a verejna adresa je potvrzena.')
      pushToast('success', 'Ulozeno a overeno', 'Verejna adresa je pripravena k pouziti.')
      setActivity({
        tone: 'success',
        text: 'Zmeny byly ulozeny a overeny',
        detail: 'Seznam i verejny odkaz jsou pripraveny bez obnoveni stranky.',
      })
    } catch (saveError) {
      setStatusError(saveError.message)
      setActivity({
        tone: 'error',
        text: 'Ukladani selhalo',
        detail: saveError.message,
      })
      pushToast('error', 'Ulozeni se nepovedlo', saveError.message)
    } finally {
      setSavePending(false)
      window.setTimeout(() => setProgress(0), 700)
    }
  }

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
    <section className="admin-shell-app">
      <SideNav summary={summary} activeView={view} onSelectView={setView} />

      <div className="admin-workspace">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="dashboard-topbar panel">
        <div className="dashboard-topbar__left">
          <div className="dashboard-burger" aria-hidden="true">
            <AdminIcon name="menu" />
          </div>
          <div>
            <p className="eyebrow">Home / Pages</p>
            <h1>Link Control Center</h1>
          </div>
        </div>

        <div className="dashboard-topbar__right">
          <ThemeToggle />
          <div className="admin-user-chip">
            <div className="admin-user-chip__avatar">
              <AdminIcon name="person" />
            </div>
            <div>
              <strong>Administrator</strong>
              <p>Ofiko workspace</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-top panel">
        <div>
          <p className="eyebrow">Page List</p>
          <h2>Sprava odkazu a embedu</h2>
          <p className="muted">
            Rychla sprava aktivnich odkazu, archivu, hesel, statistik a metadat v pracovnim rozhrani.
          </p>
        </div>

        <div className="dashboard-top-actions">
          <a className="button button-secondary" href="/api/admin/export">
            <AdminIcon name="download" className="button-icon" />
            Export CSV
          </a>
          <form method="post" action="/api/admin/logout">
            <button className="button button-secondary" type="submit">
              <AdminIcon name="logout" className="button-icon" />
              Odhlasit
            </button>
          </form>
        </div>
      </div>

      <ActivityBanner
        tone={activity.tone}
        text={activity.text}
        detail={activity.detail}
      />
      {progress > 0 ? (
        <div className="progress-strip" aria-hidden="true">
          <div className="progress-strip__bar" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="summary-grid">
        <SummaryCard label="Celkem odkazu" value={summary.total} />
        <SummaryCard label="Aktivni" value={summary.active} tone="success" />
        <SummaryCard label="Archiv" value={summary.archived} tone="muted" />
        <SummaryCard label="Chranene heslem" value={summary.protected} tone="brand" />
        <SummaryCard label="Vypnute" value={summary.disabled} tone="warning" />
        <SummaryCard label="Expirovane" value={summary.expired} tone="danger" />
      </div>

      <BulkBar
        selectedSlugs={selectedSlugs}
        activeView={view}
        onBulkAction={handleBulkAction}
        pending={bulkPending}
      />

      <div className="admin-layout admin-layout--wide">
        <div className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Editor odkazu</p>
              <h2>{initialSlug ? 'Uprava zaznamu' : 'Novy odkaz'}</h2>
            </div>
          </div>

          {statusMessage ? <p className="success-box">{statusMessage}</p> : null}
          {statusError ? <p className="error-box">{statusError}</p> : null}

          <form className="stack" method="post" action="/api/admin/embeds" onSubmit={handleSave}>
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

            <button className="button button-primary" type="submit" disabled={savePending}>
              {savePending ? 'Ukladam...' : 'Ulozit odkaz'}
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
                Zobrazeno <strong>{filtered.length}</strong> z <strong>{items.length}</strong> odkazu
              </p>
            </div>
          </div>

          <div className="records-column">
            <div className="records-table-head panel">
              <span>Vyber</span>
              <span>Verejna adresa</span>
              <span>Stav</span>
              <span>Statistiky</span>
              <span>Upraveno</span>
              <span>Akce</span>
            </div>
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
                  onAction={handleCardAction}
                  pendingAction={pendingMap[embed.slug]}
                />
              ))
            )}
          </div>
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
