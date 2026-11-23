import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { ConnectionDTO, ConnectionTestDTO, ProviderName } from '../../shared/contract.js'
import { decryptJson, encryptJson, newId } from '../crypto.js'
import { getDb } from '../db/client.js'
import { channelRoutes, channels, connections, linkedProfiles } from '../db/schema.js'
import { HttpError, ok, readJson } from '../http.js'
import { testConnection, type FoundProfile, type Secret, type TestResult } from '../providers.js'
import { route } from '../router.js'
import { readSettings } from './settings.js'
import { oneOf, str } from '../validate.js'

type Row = typeof connections.$inferSelect
type ProfileRow = typeof linkedProfiles.$inferSelect

const PROVIDERS = ['Buffer', 'Zernio', 'Cloudinary'] as const
const toDb = (p: ProviderName) => p.toLowerCase() as Row['provider']
const fromDb = (p: Row['provider']) => (p === 'buffer' ? 'Buffer' : p === 'zernio' ? 'Zernio' : 'Cloudinary') as ProviderName

export function toDTO(row: Row, profiles: ProfileRow[]): ConnectionDTO {
  return {
    id: row.id,
    provider: fromDb(row.provider),
    label: row.label,
    keyHint: row.keyHint,
    cloudName: row.cloudName,
    status: row.status,
    error: row.error,
    testedAt: row.testedAt ? row.testedAt.toISOString() : null,
    usage: row.usageUsed !== null && row.usageLimit !== null ? { used: row.usageUsed, limit: row.usageLimit } : null,
    profiles: profiles
      .filter((p) => p.connectionId === row.id)
      .map((p) => ({ id: p.id, platform: p.platform, handle: p.handle, missing: p.missing })),
  }
}

async function loadDTO(id: string) {
  const db = getDb()
  const [row] = await db.select().from(connections).where(eq(connections.id, id))
  if (!row) throw new HttpError(404, 'Koneksi tidak ditemukan')
  const profiles = await db
    .select()
    .from(linkedProfiles)
    .where(eq(linkedProfiles.connectionId, id))
    .orderBy(asc(linkedProfiles.platform), asc(linkedProfiles.handle))
  return toDTO(row, profiles)
}

const hint = (key: string) => key.slice(-4)

/**
 * Samakan daftar akun tertaut dengan hasil tes. Akun yang hilang dari provider
 * dihapus — KECUALI masih dirujuk channel: ditandai `missing` supaya operator
 * melihatnya, bukan dihapus diam-diam (yang akan mematahkan rute channel).
 */
async function syncProfiles(connectionId: string, found: FoundProfile[]) {
  const db = getDb()
  const rows = found.map((f) => ({
    id: `${connectionId}:${f.externalId}`,
    connectionId,
    externalId: f.externalId,
    platform: f.platform,
    handle: f.handle,
    missing: false,
  }))
  if (rows.length) {
    await db
      .insert(linkedProfiles)
      .values(rows)
      .onConflictDoUpdate({
        target: linkedProfiles.id,
        set: { platform: sql`excluded.platform`, handle: sql`excluded.handle`, missing: false },
      })
  }
  const keep = rows.map((r) => r.id)
  const stale = await db
    .select({ id: linkedProfiles.id })
    .from(linkedProfiles)
    .where(
      keep.length
        ? and(eq(linkedProfiles.connectionId, connectionId), notInArray(linkedProfiles.id, keep))
        : eq(linkedProfiles.connectionId, connectionId),
    )
  if (stale.length === 0) return
  const staleIds = stale.map((s) => s.id)
  const used = new Set(
    (await db.select({ id: channelRoutes.profileId }).from(channelRoutes).where(inArray(channelRoutes.profileId, staleIds))).map(
      (u) => u.id,
    ),
  )
  const drop = staleIds.filter((id) => !used.has(id))
  const mark = staleIds.filter((id) => used.has(id))
  if (mark.length) await db.update(linkedProfiles).set({ missing: true }).where(inArray(linkedProfiles.id, mark))
  if (drop.length) await db.delete(linkedProfiles).where(inArray(linkedProfiles.id, drop))
}

async function applyTest(id: string, result: TestResult) {
  await getDb()
    .update(connections)
    .set({
      status: result.ok ? 'ok' : 'error',
      error: result.error,
      testedAt: new Date(),
      ...(result.usage ? { usageUsed: result.usage.used, usageLimit: result.usage.limit } : {}),
      updatedAt: new Date(),
    })
    .where(eq(connections.id, id))
  if (result.ok) await syncProfiles(id, result.profiles)
}

const toTestDTO = (r: TestResult): ConnectionTestDTO => ({ ok: r.ok, error: r.error, profiles: r.profiles.length, usage: r.usage })

/** Gabungkan secret baru dengan yang tersimpan: field kosong = pertahankan nilai lama. */
function mergeSecret(stored: Secret | null, apiKey: string, apiSecret: string): Secret {
  return { apiKey: apiKey || stored?.apiKey || '', apiSecret: apiSecret || stored?.apiSecret || undefined }
}

route('GET', '/connections', async () => {
  const db = getDb()
  const rows = await db.select().from(connections).orderBy(asc(connections.createdAt))
  const profiles = await db.select().from(linkedProfiles).orderBy(asc(linkedProfiles.platform), asc(linkedProfiles.handle))
  return ok(rows.map((r) => toDTO(r, profiles)))
})

// Uji kredensial tanpa menyimpan (tombol "Tes" di form). Dengan id: field kosong memakai secret tersimpan.
route('POST', '/connections/test', async ({ req }) => {
  const body = await readJson(req)
  let provider = oneOf(body, 'provider', 'Layanan', PROVIDERS, 'Buffer')
  let stored: Secret | null = null
  let cloudName = str(body, 'cloudName', 'Cloud name', { max: 100 })
  const id = str(body, 'id', 'id', { max: 64 })
  if (id) {
    const [row] = await getDb().select().from(connections).where(eq(connections.id, id))
    if (!row) throw new HttpError(404, 'Koneksi tidak ditemukan')
    provider = fromDb(row.provider)
    stored = decryptJson<Secret>(row.secretEnc)
    cloudName = cloudName || row.cloudName || ''
  }
  const secret = mergeSecret(stored, str(body, 'apiKey', 'API key', { max: 500 }), str(body, 'apiSecret', 'API secret', { max: 500 }))
  return ok(toTestDTO(await testConnection(provider, secret, cloudName || null)))
})

route('POST', '/connections', async ({ req }) => {
  const body = await readJson(req)
  const provider = oneOf(body, 'provider', 'Layanan', PROVIDERS)
  const label = str(body, 'label', 'Nama koneksi', { required: true, max: 80 })
  const apiKey = str(body, 'apiKey', 'API key', { required: true, max: 500 })
  const apiSecret = str(body, 'apiSecret', 'API secret', { required: provider === 'Cloudinary', max: 500 })
  const cloudName = provider === 'Cloudinary' ? str(body, 'cloudName', 'Cloud name', { required: true, max: 100 }) : null
  const secret: Secret = { apiKey, apiSecret: apiSecret || undefined }
  const result = await testConnection(provider, secret, cloudName)
  const id = newId(provider === 'Cloudinary' ? 'cld' : provider === 'Buffer' ? 'buf' : 'zer')
  await getDb()
    .insert(connections)
    .values({ id, provider: toDb(provider), label, secretEnc: encryptJson(secret), keyHint: hint(apiKey), cloudName })
  await applyTest(id, result)
  return ok(await loadDTO(id))
})

route('PATCH', '/connections/:id', async ({ req, params }) => {
  const body = await readJson(req)
  const db = getDb()
  const [row] = await db.select().from(connections).where(eq(connections.id, params.id))
  if (!row) throw new HttpError(404, 'Koneksi tidak ditemukan')
  const label = str(body, 'label', 'Nama koneksi', { max: 80 }) || row.label
  const apiKey = str(body, 'apiKey', 'API key', { max: 500 })
  const apiSecret = str(body, 'apiSecret', 'API secret', { max: 500 })
  const cloudName = row.provider === 'cloudinary' ? str(body, 'cloudName', 'Cloud name', { max: 100 }) || row.cloudName : null
  const credentialsChanged = Boolean(apiKey || apiSecret) || cloudName !== row.cloudName
  const secret = mergeSecret(decryptJson<Secret>(row.secretEnc), apiKey, apiSecret)
  await db
    .update(connections)
    .set({ label, cloudName, secretEnc: encryptJson(secret), keyHint: hint(secret.apiKey), updatedAt: new Date() })
    .where(eq(connections.id, row.id))
  if (credentialsChanged) await applyTest(row.id, await testConnection(fromDb(row.provider), secret, cloudName))
  return ok(await loadDTO(row.id))
})

route('POST', '/connections/:id/test', async ({ params }) => {
  const [row] = await getDb().select().from(connections).where(eq(connections.id, params.id))
  if (!row) throw new HttpError(404, 'Koneksi tidak ditemukan')
  await applyTest(row.id, await testConnection(fromDb(row.provider), decryptJson<Secret>(row.secretEnc), row.cloudName))
  return ok(await loadDTO(row.id))
})

route('DELETE', '/connections/:id', async ({ params }) => {
  const db = getDb()
  const [row] = await db.select().from(connections).where(eq(connections.id, params.id))
  if (!row) throw new HttpError(404, 'Koneksi tidak ditemukan')
  const viaRoutes = await db
    .selectDistinct({ name: channels.name })
    .from(channelRoutes)
    .innerJoin(channels, eq(channels.id, channelRoutes.channelId))
    .where(eq(channelRoutes.connectionId, row.id))
  const viaStorage = await db.select({ name: channels.name }).from(channels).where(eq(channels.storageConnectionId, row.id))
  const users = [...new Set([...viaRoutes, ...viaStorage].map((u) => u.name))]
  if (users.length) throw new HttpError(409, `Masih dipakai channel: ${users.join(', ')}. Pindahkan dulu channelnya ke koneksi lain.`)
  if ((await readSettings()).globalStorageId === row.id)
    throw new HttpError(409, 'Ini storage global. Pilih storage global lain di Pengaturan dulu.')
  await db.delete(connections).where(eq(connections.id, row.id))
  return ok(null)
})
