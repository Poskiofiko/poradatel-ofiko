import fs from 'fs/promises'
import path from 'path'

import { get, put } from '@vercel/blob'

import { hashProtectedPassword } from './auth'
import { STORAGE_PATH } from './config'

const localDataPath = path.join(process.cwd(), 'data', 'embeds.json')
const MAX_AUDIT_EVENTS = 40

function getBlobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function normalizeTags(input) {
  if (!input) {
    return []
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean)
      .filter((item, index, all) => all.indexOf(item) === index)
  }

  return String(input)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
}

function createAuditEntry(action, detail = '') {
  return {
    at: new Date().toISOString(),
    action,
    detail,
  }
}

function normalizeAuditLog(log) {
  if (!Array.isArray(log)) {
    return []
  }

  return log
    .filter((item) => item?.at && item?.action)
    .slice(0, MAX_AUDIT_EVENTS)
}

function normalizeRecord(record, { includeSecrets = false } = {}) {
  const normalized = {
    slug: record.slug,
    url: record.url,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
    passwordProtected: Boolean(record.passwordHash),
    archived: Boolean(record.archivedAt),
    archivedAt: record.archivedAt || null,
    isEnabled: record.isEnabled !== false,
    expiresAt: record.expiresAt || null,
    category: record.category ? String(record.category).trim() : '',
    note: record.note ? String(record.note).trim() : '',
    tags: normalizeTags(record.tags),
    viewCount: Number(record.viewCount || 0),
    lastViewedAt: record.lastViewedAt || null,
    auditLog: normalizeAuditLog(record.auditLog),
  }

  if (includeSecrets) {
    normalized.passwordHash = record.passwordHash || null
  }

  return normalized
}

async function readLocalData() {
  try {
    const raw = await fs.readFile(localDataPath, 'utf8')
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed?.embeds)) {
      return { embeds: [] }
    }

    return {
      embeds: parsed.embeds.map((embed) =>
        normalizeRecord(embed, { includeSecrets: true })
      ),
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { embeds: [] }
    }

    throw error
  }
}

async function writeLocalData(data) {
  await fs.mkdir(path.dirname(localDataPath), { recursive: true })
  await fs.writeFile(localDataPath, JSON.stringify(data, null, 2))
}

async function readBlobData() {
  const result = await get(STORAGE_PATH, {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  if (!result) {
    return { embeds: [] }
  }

  const text = await new Response(result.stream).text()
  const parsed = JSON.parse(text)

  if (!Array.isArray(parsed?.embeds)) {
    return { embeds: [] }
  }

  return {
    embeds: parsed.embeds.map((embed) =>
      normalizeRecord(embed, { includeSecrets: true })
    ),
  }
}

async function writeBlobData(data) {
  await put(STORAGE_PATH, JSON.stringify(data, null, 2), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
}

async function readData() {
  if (getBlobEnabled()) {
    return readBlobData()
  }

  return readLocalData()
}

async function writeData(data) {
  if (getBlobEnabled()) {
    return writeBlobData(data)
  }

  return writeLocalData(data)
}

export function sanitizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function validateTargetUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function updateRecord(current, patch, auditEntry) {
  const auditLog = auditEntry
    ? [auditEntry, ...normalizeAuditLog(current.auditLog)]
    : normalizeAuditLog(current.auditLog)

  return normalizeRecord(
    {
      ...current,
      ...patch,
      auditLog: auditLog.slice(0, MAX_AUDIT_EVENTS),
    },
    { includeSecrets: true }
  )
}

export async function listEmbeds() {
  const data = await readData()

  return [...data.embeds]
    .map((embed) => normalizeRecord(embed))
    .sort((left, right) => left.slug.localeCompare(right.slug))
}

export async function getEmbedBySlug(slug, { includeSecrets = false } = {}) {
  const cleanSlug = sanitizeSlug(slug)
  const data = await readData()

  const embed = data.embeds.find((item) => item.slug === cleanSlug)
  return embed ? normalizeRecord(embed, { includeSecrets }) : null
}

export async function saveEmbed(input) {
  const cleanSlug = sanitizeSlug(input.slug)

  if (!cleanSlug) {
    throw new Error('Slug je povinny.')
  }

  if (!validateTargetUrl(input.url)) {
    throw new Error('URL musi byt platna HTTPS adresa.')
  }

  const data = await readData()
  const now = new Date().toISOString()
  const existing = data.embeds.findIndex((item) => item.slug === cleanSlug)
  const previous = existing >= 0 ? data.embeds[existing] : null
  let passwordHash = previous?.passwordHash || null

  if (input.removePassword === 'on') {
    passwordHash = null
  } else if (input.password && String(input.password).trim()) {
    passwordHash = hashProtectedPassword(String(input.password).trim())
  }

  const nextRecord = updateRecord(
    previous ||
      normalizeRecord(
        {
          slug: cleanSlug,
          url: input.url,
          createdAt: now,
          updatedAt: now,
          isEnabled: true,
          auditLog: [],
        },
        { includeSecrets: true }
      ),
    {
      slug: cleanSlug,
      url: input.url,
      updatedAt: now,
      passwordHash,
      archivedAt: previous?.archivedAt || null,
      isEnabled: input.isEnabled === 'off' ? false : true,
      expiresAt: input.expiresAt ? String(input.expiresAt) : null,
      category: input.category ? String(input.category).trim() : '',
      note: input.note ? String(input.note).trim() : '',
      tags: normalizeTags(input.tags),
    },
    createAuditEntry(
      existing >= 0 ? 'updated' : 'created',
      existing >= 0 ? 'Zmena odkazu v adminu' : 'Novy odkaz vytvoren'
    )
  )

  if (existing >= 0) {
    data.embeds[existing] = nextRecord
  } else {
    data.embeds.push(nextRecord)
  }

  await writeData(data)

  return normalizeRecord(nextRecord)
}

export async function deleteEmbed(slug) {
  const cleanSlug = sanitizeSlug(slug)
  const data = await readData()
  const nextEmbeds = data.embeds.filter((item) => item.slug !== cleanSlug)

  if (nextEmbeds.length === data.embeds.length) {
    return false
  }

  await writeData({ embeds: nextEmbeds })
  return true
}

export async function setEmbedArchived(slug, archived) {
  const cleanSlug = sanitizeSlug(slug)
  const data = await readData()
  const existing = data.embeds.findIndex((item) => item.slug === cleanSlug)

  if (existing < 0) {
    return false
  }

  const current = data.embeds[existing]
  data.embeds[existing] = updateRecord(
    current,
    {
      updatedAt: new Date().toISOString(),
      archivedAt: archived ? new Date().toISOString() : null,
    },
    createAuditEntry(
      archived ? 'archived' : 'restored',
      archived ? 'Presunuto do archivu' : 'Obnoveno z archivu'
    )
  )

  await writeData(data)
  return true
}

export async function setEmbedEnabled(slug, isEnabled) {
  const cleanSlug = sanitizeSlug(slug)
  const data = await readData()
  const existing = data.embeds.findIndex((item) => item.slug === cleanSlug)

  if (existing < 0) {
    return false
  }

  const current = data.embeds[existing]
  data.embeds[existing] = updateRecord(
    current,
    {
      updatedAt: new Date().toISOString(),
      isEnabled,
    },
    createAuditEntry(
      isEnabled ? 'enabled' : 'disabled',
      isEnabled ? 'Odkaz znovu povolen' : 'Odkaz docasne vypnut'
    )
  )

  await writeData(data)
  return true
}

export async function incrementEmbedView(slug) {
  const cleanSlug = sanitizeSlug(slug)
  const data = await readData()
  const existing = data.embeds.findIndex((item) => item.slug === cleanSlug)

  if (existing < 0) {
    return false
  }

  const current = data.embeds[existing]
  data.embeds[existing] = updateRecord(current, {
    updatedAt: current.updatedAt,
    viewCount: Number(current.viewCount || 0) + 1,
    lastViewedAt: new Date().toISOString(),
  })

  await writeData(data)
  return true
}

export async function duplicateEmbed(slug) {
  const current = await getEmbedBySlug(slug, { includeSecrets: true })

  if (!current) {
    throw new Error('Odkaz nebyl nalezen.')
  }

  let suffix = 2
  let nextSlug = `${current.slug}-copy`
  const all = await listEmbeds()

  while (all.some((item) => item.slug === nextSlug)) {
    nextSlug = `${current.slug}-copy-${suffix}`
    suffix += 1
  }

  return saveEmbed({
    slug: nextSlug,
    url: current.url,
    category: current.category,
    note: current.note,
    tags: current.tags.join(', '),
    expiresAt: current.expiresAt || '',
    isEnabled: current.isEnabled ? 'on' : 'off',
  })
}

export async function bulkUpdateEmbeds(slugs, action) {
  const cleanSlugs = Array.isArray(slugs)
    ? slugs.map((slug) => sanitizeSlug(slug)).filter(Boolean)
    : [sanitizeSlug(slugs)].filter(Boolean)

  if (cleanSlugs.length === 0) {
    return 0
  }

  let changed = 0

  for (const slug of cleanSlugs) {
    if (action === 'archive') {
      changed += (await setEmbedArchived(slug, true)) ? 1 : 0
    } else if (action === 'restore') {
      changed += (await setEmbedArchived(slug, false)) ? 1 : 0
    } else if (action === 'delete') {
      changed += (await deleteEmbed(slug)) ? 1 : 0
    } else if (action === 'enable') {
      changed += (await setEmbedEnabled(slug, true)) ? 1 : 0
    } else if (action === 'disable') {
      changed += (await setEmbedEnabled(slug, false)) ? 1 : 0
    }
  }

  return changed
}

function toCsvValue(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export function exportEmbedsToCsv(embeds) {
  const header = [
    'slug',
    'public_url',
    'target_url',
    'category',
    'tags',
    'password_protected',
    'archived',
    'enabled',
    'expires_at',
    'view_count',
    'last_viewed_at',
    'created_at',
    'updated_at',
    'note',
  ]

  const rows = embeds.map((embed) =>
    [
      embed.slug,
      embed.publicUrl || '',
      embed.url,
      embed.category || '',
      normalizeTags(embed.tags).join(', '),
      embed.passwordProtected ? 'yes' : 'no',
      embed.archived ? 'yes' : 'no',
      embed.isEnabled ? 'yes' : 'no',
      embed.expiresAt || '',
      embed.viewCount || 0,
      embed.lastViewedAt || '',
      embed.createdAt || '',
      embed.updatedAt || '',
      embed.note || '',
    ]
      .map(toCsvValue)
      .join(',')
  )

  return [header.join(','), ...rows].join('\n')
}
