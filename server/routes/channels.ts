import { and, asc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm'
import { normHandle, PLATFORM_KEYS, STAGES, type ChannelDTO, type RouteDTO } from '../../shared/contract.js'
import { getDb } from '../db/client.js'
import { channelRoutes, channels, connections, linkedProfiles } from '../db/schema.js'
import { HttpError, ok, readJson } from '../http.js'
import { route } from '../router.js'
import { bool, has, num, oneOf, str, strArray } from '../validate.js'

type Row = typeof channels.$inferSelect
type RouteRow = typeof channelRoutes.$inferSelect
type Body = Record<string, unknown>

function toDTO(row: Row, routes: RouteRow[]): ChannelDTO {
  return {
    id: row.id,
    name: row.name,
    niche: row.niche,
    stage: row.stage,
    format: row.format,
    hypothesis: row.hypothesis,
    email: row.email,
    captionTemplate: row.captionTemplate,
    hashtags: row.hashtags,
    dayTotal: row.dayTotal,
    vidsTotal: row.vidsTotal,
    targetMetric: row.targetMetric,
    targetValue: row.targetValue,
    costPerMonth: row.costPerMonth,
    perDay: row.perDay,
    scheduleMode: row.scheduleMode,
    manualSlots: row.manualSlots,
    storageConnectionId: row.storageConnectionId,
    auto: row.auto,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    routes: routes
      .filter((r) => r.channelId === row.id)
      .sort((a, b) => a.platform - b.platform)
      .map((r) => ({ platform: r.platform, connectionId: r.connectionId, profileId: r.profileId })),
  }
}

async function loadDTO(id: string) {
  const db = getDb()
  const [row] = await db.select().from(channels).where(eq(channels.id, id))
  if (!row) throw new HttpError(404, 'Channel tidak ditemukan')
  return toDTO(row, await db.select().from(channelRoutes).where(eq(channelRoutes.channelId, id)))
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'channel'

async function uniqueId(name: string) {
  const base = slugify(name)
  const taken = new Set((await getDb().select({ id: channels.id }).from(channels)).map((r) => r.id))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

/** Field channel dari body. `partial` = PATCH: hanya kunci yang dikirim yang diambil. */
function parseFields(body: Body, partial: boolean) {
  const f: Partial<typeof channels.$inferInsert> = {}
  const want = (k: string) => !partial || has(body, k)
  if (want('name')) f.name = str(body, 'name', 'Nama channel', { required: true, max: 60 })
  if (want('niche')) f.niche = str(body, 'niche', 'Niche', { required: true, max: 40 })
  if (want('stage')) f.stage = oneOf(body, 'stage', 'Tahap', STAGES, 'Bibit')
  if (want('format')) f.format = str(body, 'format', 'Format', { max: 40, def: 'Faceless' })
  if (want('hypothesis')) f.hypothesis = str(body, 'hypothesis', 'Hipotesis', { max: 300 })
  if (want('email')) f.email = str(body, 'email', 'Email akun', { max: 200 })
  if (want('captionTemplate')) f.captionTemplate = str(body, 'captionTemplate', 'Template caption', { max: 2000 })
  if (want('hashtags')) f.hashtags = strArray(body, 'hashtags', 'Hashtag', { maxItems: 30, maxLen: 60 })
  if (want('dayTotal')) f.dayTotal = num(body, 'dayTotal', 'Masa uji (hari)', { min: 1, max: 365, int: true, def: 30 })
  if (want('vidsTotal')) f.vidsTotal = num(body, 'vidsTotal', 'Masa uji (video)', { min: 1, max: 1000, int: true, def: 30 })
  if (want('targetMetric')) f.targetMetric = str(body, 'targetMetric', 'Metrik target', { max: 60, def: 'Median views/post' })
  if (want('targetValue')) f.targetValue = num(body, 'targetValue', 'Nilai target', { min: 0, max: 1e10, def: 1000 })
  if (want('costPerMonth')) f.costPerMonth = num(body, 'costPerMonth', 'Biaya per bulan', { min: 0, max: 1e10, int: true, def: 0 })
  if (want('perDay')) f.perDay = num(body, 'perDay', 'Video per hari', { min: 0, max: 10, int: true, def: 1 })
  if (want('scheduleMode')) f.scheduleMode = oneOf(body, 'scheduleMode', 'Mode jadwal', ['auto', 'manual'] as const, 'auto')
  if (want('manualSlots'))
    f.manualSlots = strArray(body, 'manualSlots', 'Jam posting', { maxItems: 10, maxLen: 5, pattern: /^([01]\d|2[0-3])\.[0-5]\d$/ })
  if (want('auto')) f.auto = bool(body, 'auto', false)
  if (want('storageConnectionId')) {
    const v = body.storageConnectionId
    if (v !== null && v !== undefined && typeof v !== 'string') throw new HttpError(400, 'Storage tidak valid')
    f.storageConnectionId = (v as string | null | undefined) || null
  }
  return f
}

async function checkStorage(id: string | null | undefined) {
  if (!id) return
  const [row] = await getDb().select({ provider: connections.provider }).from(connections).where(eq(connections.id, id))
  if (!row || row.provider !== 'cloudinary') throw new HttpError(400, 'Storage harus koneksi Cloudinary yang terdaftar')
}

function parseRoutes(body: Body): RouteDTO[] {
  const v = body.routes
  if (v === undefined || v === null) return []
  if (!Array.isArray(v) || v.length > PLATFORM_KEYS.length) throw new HttpError(400, 'Rute platform tidak valid')
  const seen = new Set<number>()
  return v.map((r) => {
    const o = r as Body
    const platform = num(o, 'platform', 'Platform', { min: 0, max: PLATFORM_KEYS.length - 1, int: true })
    if (seen.has(platform)) throw new HttpError(400, 'Satu platform hanya boleh punya satu rute')
    seen.add(platform)
    return {
      platform,
      connectionId: str(o, 'connectionId', 'Koneksi', { required: true, max: 64 }),
      profileId: str(o, 'profileId', 'Akun', { required: true, max: 200 }),
    }
  })
}

const PLATFORM_LABEL = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Threads']

/**
 * Setiap rute wajib menunjuk akun yang benar-benar tertaut di koneksi scheduler itu,
 * di platform yang sama. Akun yang sudah dipakai channel lain (yang masih hidup)
 * DITOLAK: dua channel di satu akun = posting ganda. Akun dicocokkan lewat handle,
 * karena akun yang sama bisa tertaut di Buffer dan Zernio dengan ID berbeda.
 */
async function checkRoutes(routes: RouteDTO[], channelId: string | null) {
  if (routes.length === 0) return
  const db = getDb()
  const profiles = await db
    .select({
      id: linkedProfiles.id,
      connectionId: linkedProfiles.connectionId,
      platform: linkedProfiles.platform,
      handle: linkedProfiles.handle,
      provider: connections.provider,
    })
    .from(linkedProfiles)
    .innerJoin(connections, eq(connections.id, linkedProfiles.connectionId))
    .where(
      inArray(
        linkedProfiles.id,
        routes.map((r) => r.profileId),
      ),
    )
  for (const r of routes) {
    const p = profiles.find((x) => x.id === r.profileId)
    if (!p || p.connectionId !== r.connectionId)
      throw new HttpError(400, `Akun ${PLATFORM_LABEL[r.platform]} tidak ditemukan di koneksi yang dipilih`)
    if (p.provider === 'cloudinary') throw new HttpError(400, 'Rute platform harus memakai koneksi Buffer atau Zernio')
    if (p.platform !== r.platform) throw new HttpError(400, `Akun ${p.handle} bukan akun ${PLATFORM_LABEL[r.platform]}`)
    const clash = await db
      .select({ name: channels.name })
      .from(channelRoutes)
      .innerJoin(linkedProfiles, eq(linkedProfiles.id, channelRoutes.profileId))
      .innerJoin(channels, eq(channels.id, channelRoutes.channelId))
      .where(
        and(
          eq(channelRoutes.platform, r.platform),
          sql`lower(ltrim(trim(${linkedProfiles.handle}), '@')) = ${normHandle(p.handle)}`,
          ne(channels.stage, 'Dipangkas'),
          channelId ? ne(channels.id, channelId) : sql`true`,
        ),
      )
      .limit(1)
    if (clash.length) throw new HttpError(409, `Akun ${PLATFORM_LABEL[r.platform]} ${p.handle} sudah dipakai channel '${clash[0].name}'`)
  }
}

/** Tulis rute: tambah/perbarui dulu, baru hapus yang tidak ada — gagal di tengah tidak meninggalkan channel tanpa rute. */
async function writeRoutes(channelId: string, routes: RouteDTO[]) {
  const db = getDb()
  if (routes.length) {
    await db
      .insert(channelRoutes)
      .values(routes.map((r) => ({ channelId, ...r })))
      .onConflictDoUpdate({
        target: [channelRoutes.channelId, channelRoutes.platform],
        set: { connectionId: sql`excluded.connection_id`, profileId: sql`excluded.profile_id` },
      })
  }
  const keep = routes.map((r) => r.platform)
  await db
    .delete(channelRoutes)
    .where(
      keep.length
        ? and(eq(channelRoutes.channelId, channelId), notInArray(channelRoutes.platform, keep))
        : eq(channelRoutes.channelId, channelId),
    )
}

route('GET', '/channels', async () => {
  const db = getDb()
  const rows = await db.select().from(channels).orderBy(asc(channels.createdAt))
  const routes = await db.select().from(channelRoutes)
  return ok(rows.map((r) => toDTO(r, routes)))
})

route('POST', '/channels', async ({ req }) => {
  const body = await readJson(req)
  const fields = parseFields(body, false)
  const routes = parseRoutes(body)
  await checkStorage(fields.storageConnectionId)
  await checkRoutes(routes, null)
  const start = bool(body, 'start', false)
  const id = await uniqueId(fields.name!)
  await getDb()
    .insert(channels)
    .values({
      ...fields,
      id,
      name: fields.name!,
      niche: fields.niche!,
      auto: start && fields.auto !== false,
      startedAt: start ? new Date() : null,
    })
  await writeRoutes(id, routes)
  return ok(await loadDTO(id))
})

route('PATCH', '/channels/:id', async ({ req, params }) => {
  const body = await readJson(req)
  const db = getDb()
  const [row] = await db.select().from(channels).where(eq(channels.id, params.id))
  if (!row) throw new HttpError(404, 'Channel tidak ditemukan')
  const fields = parseFields(body, true)
  if (has(fields as Body, 'storageConnectionId')) await checkStorage(fields.storageConnectionId)
  const routes = has(body, 'routes') ? parseRoutes(body) : null
  if (routes) await checkRoutes(routes, row.id)
  const start = has(body, 'start') && bool(body, 'start', false) && !row.startedAt
  await db
    .update(channels)
    .set({ ...fields, ...(start ? { startedAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(channels.id, row.id))
  if (routes) await writeRoutes(row.id, routes)
  return ok(await loadDTO(row.id))
})

route('DELETE', '/channels/:id', async ({ params }) => {
  const db = getDb()
  const [row] = await db.select({ id: channels.id }).from(channels).where(eq(channels.id, params.id))
  if (!row) throw new HttpError(404, 'Channel tidak ditemukan')
  await db.delete(channels).where(eq(channels.id, row.id))
  return ok(null)
})
