import fs from 'fs/promises'
import path from 'path'

import { get, put } from '@vercel/blob'

import { hashProtectedPassword } from './auth'
import { STORAGE_PATH } from './config'

const localDataPath = path.join(process.cwd(), 'data', 'embeds.json')

function getBlobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function normalizeRecord(record, { includeSecrets = false } = {}) {
  const normalized = {
    slug: record.slug,
    url: record.url,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
    passwordProtected: Boolean(record.passwordHash),
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

    return { embeds: parsed.embeds.map((embed) => normalizeRecord(embed, { includeSecrets: true })) }
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

export async function saveEmbed({ slug, url, password, removePassword }) {
  const cleanSlug = sanitizeSlug(slug)

  if (!cleanSlug) {
    throw new Error('Slug je povinný.')
  }

  if (!validateTargetUrl(url)) {
    throw new Error('URL musí být platná HTTPS adresa.')
  }

  const data = await readData()
  const now = new Date().toISOString()
  const existing = data.embeds.findIndex((item) => item.slug === cleanSlug)
  const previous = existing >= 0 ? data.embeds[existing] : null
  let passwordHash = previous?.passwordHash || null

  if (removePassword === 'on') {
    passwordHash = null
  } else if (password && String(password).trim()) {
    passwordHash = hashProtectedPassword(String(password).trim())
  }

  const nextRecord = normalizeRecord({
    slug: cleanSlug,
    url,
    createdAt: existing >= 0 ? data.embeds[existing].createdAt : now,
    updatedAt: now,
    passwordHash,
  }, { includeSecrets: true })

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
