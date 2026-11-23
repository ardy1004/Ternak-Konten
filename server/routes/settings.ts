import { eq, sql } from 'drizzle-orm'
import { DEFAULT_SETTINGS, type MonetizationRule, type SettingsDTO } from '../../shared/contract.js'
import { getDb } from '../db/client.js'
import { connections, settings } from '../db/schema.js'
import { HttpError, ok, readJson } from '../http.js'
import { route } from '../router.js'
import { bool, has, num, str } from '../validate.js'

type Key = keyof SettingsDTO

/** Pengaturan tersimpan per kunci; kunci yang belum pernah disimpan memakai nilai bawaan. */
export async function readSettings(): Promise<SettingsDTO> {
  const rows = await getDb().select().from(settings)
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SettingsDTO>
  return { ...DEFAULT_SETTINGS, ...stored }
}

const METRICS = ['followers', 'views30', 'views90', 'watchHours'] as const

function parseRules(v: unknown): MonetizationRule[] {
  if (!Array.isArray(v) || v.length > 10) throw new HttpError(400, 'Syarat monetisasi tidak valid')
  return v.map((r) => {
    const o = r as Record<string, unknown>
    const reqs = (key: 'all' | 'anyOf') => {
      const list = o[key]
      if (!Array.isArray(list) || list.length > 5) throw new HttpError(400, 'Syarat monetisasi tidak valid')
      return list.map((q) => {
        const x = q as Record<string, unknown>
        if (!METRICS.includes(x.metric as (typeof METRICS)[number])) throw new HttpError(400, 'Metrik syarat tidak dikenal')
        return {
          metric: x.metric as (typeof METRICS)[number],
          label: str(x, 'label', 'Label syarat', { required: true, max: 80 }),
          target: num(x, 'target', 'Target syarat', { min: 0, max: 1e10 }),
        }
      })
    }
    return {
      platform: num(o, 'platform', 'Platform', { min: 0, max: 4, int: true }),
      program: str(o, 'program', 'Nama program', { required: true, max: 80 }),
      all: reqs('all'),
      anyOf: reqs('anyOf'),
    }
  })
}

route('GET', '/settings', async () => ok(await readSettings()))

/** PUT parsial: hanya kunci yang dikirim yang divalidasi & disimpan. */
route('PUT', '/settings', async ({ req }) => {
  const body = await readJson(req)
  const updates: Partial<SettingsDTO> = {}
  if (has(body, 'workspaceName')) updates.workspaceName = str(body, 'workspaceName', 'Nama workspace', { required: true, max: 80 })
  if (has(body, 'autoPosting')) updates.autoPosting = bool(body, 'autoPosting', true)
  if (has(body, 'usdRate')) updates.usdRate = num(body, 'usdRate', 'Kurs USD', { min: 1, max: 1_000_000 })
  if (has(body, 'prices')) {
    const p = (body.prices ?? {}) as Record<string, unknown>
    updates.prices = {
      buffer: num(p, 'buffer', 'Harga Buffer', { min: 0, max: 1e9, int: true }),
      zernio: num(p, 'zernio', 'Harga Zernio', { min: 0, max: 1e9, int: true }),
      cloudinary: num(p, 'cloudinary', 'Harga Cloudinary', { min: 0, max: 1e9, int: true }),
    }
  }
  if (has(body, 'testDefaults')) {
    const t = (body.testDefaults ?? {}) as Record<string, unknown>
    updates.testDefaults = {
      days: num(t, 'days', 'Hari masa uji', { min: 1, max: 365, int: true }),
      videos: num(t, 'videos', 'Video masa uji', { min: 1, max: 1000, int: true }),
      metric: str(t, 'metric', 'Metrik', { required: true, max: 60 }),
      target: num(t, 'target', 'Target', { min: 0, max: 1e10 }),
    }
  }
  if (has(body, 'monetizationRules')) updates.monetizationRules = parseRules(body.monetizationRules)
  if (has(body, 'globalStorageId')) {
    const id = body.globalStorageId
    if (id !== null) {
      if (typeof id !== 'string') throw new HttpError(400, 'Storage global tidak valid')
      const [row] = await getDb().select({ provider: connections.provider }).from(connections).where(eq(connections.id, id))
      if (!row || row.provider !== 'cloudinary') throw new HttpError(400, 'Storage global harus koneksi Cloudinary')
    }
    updates.globalStorageId = id as string | null
  }

  const entries = Object.entries(updates) as [Key, unknown][]
  if (entries.length === 0) throw new HttpError(400, 'Tidak ada pengaturan yang dikirim')
  await getDb()
    .insert(settings)
    .values(entries.map(([key, value]) => ({ key, value })))
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value`, updatedAt: new Date() } })
  return ok(await readSettings())
})
