import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ChannelDTO, ConnectionDTO, ConnectionTestDTO, SettingsDTO } from '../shared/contract.js'
import { handle } from './app.js'
import { decryptJson, hashPassword } from './crypto.js'
import { setDb, type Db } from './db/client.js'
import * as schema from './db/schema.js'
import { signToken } from './session.js'

/*
 * Uji API lewat pintu yang sama dengan produksi (handle(Request) → Response),
 * dengan Postgres sungguhan (PGlite) dan API pihak ketiga yang dipalsukan.
 */

const BASE = 'http://tk.test'
const EMAIL = 'op@tk.test'
const PASSWORD = 'rahasia-panjang-123'
let db: Db
let cookie = ''

beforeAll(async () => {
  process.env.OPERATOR_EMAIL = EMAIL
  process.env.OPERATOR_PASSWORD_HASH = await hashPassword(PASSWORD)
  process.env.SESSION_SECRET = 's'.repeat(48)
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
  delete process.env.DATABASE_URL
  delete process.env.POSTGRES_URL
  const pg = drizzle(new PGlite(), { schema })
  await migrate(pg, { migrationsFolder: 'drizzle' })
  db = pg as unknown as Db
  setDb(db)
})

afterEach(() => vi.unstubAllGlobals())

interface CallOpts {
  method?: string
  body?: unknown
  auth?: boolean
  origin?: string
  cookieOverride?: string
}

async function call<T>(path: string, o: CallOpts = {}) {
  const headers: Record<string, string> = { origin: o.origin ?? BASE }
  if (o.body !== undefined) headers['content-type'] = 'application/json'
  const c = o.cookieOverride ?? (o.auth === false ? '' : cookie)
  if (c) headers.cookie = c
  const res = await handle(
    new Request(`${BASE}/api?route=${path}`, {
      method: o.method ?? 'GET',
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    }),
  )
  const json = (await res.json()) as { ok: boolean; data: T; error: string }
  return { status: res.status, json, raw: JSON.stringify(json), headers: res.headers }
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Palsukan Buffer, Zernio, dan Cloudinary sesuai URL. */
function fakeProviders(
  opts: { bufferChannels?: { id: string; name: string; service: string }[]; zernio?: unknown; cloudinaryStatus?: number } = {},
) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url === 'https://api.buffer.com') {
      const q = JSON.parse(String(init?.body)).query as string
      if (q.includes('organizations')) return reply({ data: { account: { organizations: [{ id: 'org1', name: 'Org' }] } } })
      return reply({ data: { channels: opts.bufferChannels ?? [] } })
    }
    if (url.startsWith('https://zernio.com/api/v1/accounts')) return reply(opts.zernio ?? { accounts: [] })
    if (url.includes('api.cloudinary.com')) {
      const status = opts.cloudinaryStatus ?? 200
      return status === 200 ? reply({ credits: { usage: 12.4, limit: 25 } }) : reply({ error: { message: 'x' } }, status)
    }
    throw new Error(`fetch tak terduga: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('kesehatan & login', () => {
  it('health melaporkan database siap dan login terkonfigurasi', async () => {
    const r = await call<{ db: string; auth: boolean }>('health', { auth: false })
    expect(r.json.data).toEqual({ db: 'ok', auth: true })
  })

  it('menolak kata sandi salah dengan pesan umum', async () => {
    const r = await call('auth/login', { method: 'POST', auth: false, body: { email: EMAIL, password: 'salah' } })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Email atau kata sandi salah')
  })

  it('menolak email salah walau kata sandinya benar', async () => {
    const r = await call('auth/login', { method: 'POST', auth: false, body: { email: 'lain@tk.test', password: PASSWORD } })
    expect(r.status).toBe(401)
  })

  it('masuk memasang cookie httpOnly Secure SameSite=Strict', async () => {
    const r = await call<{ email: string }>('auth/login', {
      method: 'POST',
      auth: false,
      body: { email: EMAIL.toUpperCase(), password: PASSWORD },
    })
    expect(r.status).toBe(200)
    const set = r.headers.get('set-cookie') ?? ''
    expect(set).toMatch(/HttpOnly/)
    expect(set).toMatch(/Secure/)
    expect(set).toMatch(/SameSite=Strict/)
    cookie = set.split(';')[0]
    expect((await call<{ email: string }>('auth/me')).json.data.email).toBe(EMAIL)
  })

  it('endpoint operator menolak tanpa sesi', async () => {
    expect((await call('connections', { auth: false })).status).toBe(401)
  })

  it('token bertanda tangan sah tapi scope lain DITOLAK', async () => {
    const token = await signToken(EMAIL, 'tautan-publik', 600)
    expect((await call('auth/me', { cookieOverride: `tk_sesi=${token}` })).status).toBe(401)
  })

  it('di balik proxy, Origin yang cocok dengan header Host tetap diterima', async () => {
    // Fungsi melihat URL internal, tapi header Host/X-Forwarded-Host = host publik yang dibuka browser.
    const res = await handle(
      new Request('http://internal:3001/api?route=settings', {
        method: 'PUT',
        headers: { origin: 'https://ternak.contoh', 'x-forwarded-host': 'ternak.contoh', 'content-type': 'application/json', cookie },
        body: JSON.stringify({ usdRate: 16500 }),
      }),
    )
    expect(res.status).toBe(200)
  })

  it('permintaan mengubah data dari origin lain ditolak', async () => {
    const r = await call('settings', { method: 'PUT', origin: 'https://jahat.test', body: { usdRate: 1 } })
    expect(r.status).toBe(403)
  })
})

describe('koneksi', () => {
  let bufferId = ''
  let zernioId = ''
  let cloudId = ''

  it('menyimpan koneksi Buffer: secret terenkripsi, tidak pernah dikirim balik, akun tertaut tersimpan', async () => {
    fakeProviders({
      bufferChannels: [
        { id: 'b-yt', name: 'Dapur Uji', service: 'youtube' },
        { id: 'b-ig', name: 'ternak.ig', service: 'instagram' },
        { id: 'b-li', name: 'Kantor', service: 'linkedin' },
      ],
    })
    const r = await call<ConnectionDTO>('connections', {
      method: 'POST',
      body: { provider: 'Buffer', label: 'Buffer Uji', apiKey: 'buf-key-SECRET-1234' },
    })
    expect(r.status).toBe(200)
    expect(r.json.data.status).toBe('ok')
    expect(r.json.data.keyHint).toBe('1234')
    expect(r.raw).not.toContain('SECRET')
    // LinkedIn bukan platform aplikasi ini → dilewati.
    expect(r.json.data.profiles.map((p) => [p.platform, p.handle])).toEqual([
      [0, 'Dapur Uji'],
      [2, 'ternak.ig'],
    ])
    bufferId = r.json.data.id
    const [row] = await db.select().from(schema.connections).where(eq(schema.connections.id, bufferId))
    expect(row.secretEnc).not.toContain('SECRET')
    expect(decryptJson<{ apiKey: string }>(row.secretEnc).apiKey).toBe('buf-key-SECRET-1234')
  })

  it('membaca akun Zernio walau field-nya bersarang, dan memberi @ pada username', async () => {
    fakeProviders({
      zernio: {
        data: [
          { _id: 'z-ig', platform: 'instagram', username: 'ternak.ig', name: { _id: 'x', name: 'Nama Bersarang' } },
          { accountId: 'z-tt', type: 'tiktok', displayName: 'Akun TikTok' },
        ],
      },
    })
    const r = await call<ConnectionDTO>('connections', {
      method: 'POST',
      body: { provider: 'Zernio', label: 'Zernio Uji', apiKey: 'zer-key-5678' },
    })
    expect(r.json.data.profiles.map((p) => [p.platform, p.handle])).toEqual([
      [1, 'Akun TikTok'],
      [2, '@ternak.ig'],
    ])
    zernioId = r.json.data.id
  })

  it('kredensial Cloudinary yang salah tetap tersimpan dengan status galat yang jelas', async () => {
    fakeProviders({ cloudinaryStatus: 401 })
    const r = await call<ConnectionDTO>('connections', {
      method: 'POST',
      body: { provider: 'Cloudinary', label: 'Cloud Uji', cloudName: 'ternak-uji', apiKey: '1111', apiSecret: 'cloud-SECRET' },
    })
    expect(r.json.data.status).toBe('error')
    expect(r.json.data.error).toMatch(/salah/)
    expect(r.raw).not.toContain('cloud-SECRET')
    cloudId = r.json.data.id
  })

  it('edit tanpa mengisi secret mempertahankan secret lama dan tidak menguji ulang', async () => {
    const fetchMock = fakeProviders()
    const r = await call<ConnectionDTO>(`connections/${bufferId}`, { method: 'PATCH', body: { label: 'Buffer Utama', apiKey: '' } })
    expect(r.json.data.label).toBe('Buffer Utama')
    expect(fetchMock).not.toHaveBeenCalled()
    const [row] = await db.select().from(schema.connections).where(eq(schema.connections.id, bufferId))
    expect(decryptJson<{ apiKey: string }>(row.secretEnc).apiKey).toBe('buf-key-SECRET-1234')
  })

  it('tes ulang memperbaiki status dan menyimpan kuota Cloudinary', async () => {
    fakeProviders()
    const r = await call<ConnectionDTO>(`connections/${cloudId}/test`, { method: 'POST' })
    expect(r.json.data.status).toBe('ok')
    expect(r.json.data.usage).toEqual({ used: 12.4, limit: 25 })
  })

  it('tes tanpa menyimpan memakai secret tersimpan bila field dikosongkan', async () => {
    fakeProviders({ bufferChannels: [{ id: 'b-yt', name: 'Dapur Uji', service: 'youtube' }] })
    const r = await call<ConnectionTestDTO>('connections/test', { method: 'POST', body: { id: bufferId } })
    expect(r.json.data).toMatchObject({ ok: true, profiles: 1 })
  })

  describe('channel & rute', () => {
    const profile = async (connectionId: string, platform: number) => {
      const list = (await call<ConnectionDTO[]>('connections')).json.data
      return list.find((c) => c.id === connectionId)!.profiles.find((p) => p.platform === platform)!.id
    }
    let channelId = ''

    it('membuat channel dengan rute & storage yang sah', async () => {
      const r = await call<ChannelDTO>('channels', {
        method: 'POST',
        body: {
          name: 'Dapur Uji',
          niche: 'kuliner',
          hashtags: ['#kuliner'],
          storageConnectionId: cloudId,
          start: true,
          auto: true,
          routes: [
            { platform: 0, connectionId: bufferId, profileId: await profile(bufferId, 0) },
            { platform: 2, connectionId: bufferId, profileId: await profile(bufferId, 2) },
          ],
        },
      })
      expect(r.status).toBe(200)
      expect(r.json.data.id).toBe('dapur-uji')
      expect(r.json.data.routes).toHaveLength(2)
      expect(r.json.data.startedAt).not.toBeNull()
      channelId = r.json.data.id
    })

    it('MENOLAK akun yang sama lewat provider lain (ternak.ig vs @ternak.ig)', async () => {
      const r = await call('channels', {
        method: 'POST',
        body: {
          name: 'Channel Lain',
          niche: 'kuliner',
          routes: [{ platform: 2, connectionId: zernioId, profileId: await profile(zernioId, 2) }],
        },
      })
      expect(r.status).toBe(409)
      expect(r.json.error).toMatch(/sudah dipakai channel 'Dapur Uji'/)
    })

    it('menolak akun yang bukan milik platform rutenya', async () => {
      const r = await call('channels', {
        method: 'POST',
        body: {
          name: 'Salah Platform',
          niche: 'edukasi',
          routes: [{ platform: 1, connectionId: bufferId, profileId: await profile(bufferId, 0) }],
        },
      })
      expect(r.status).toBe(400)
    })

    it('menolak Buffer sebagai storage', async () => {
      const r = await call('channels', { method: 'POST', body: { name: 'Storage Salah', niche: 'edukasi', storageConnectionId: bufferId } })
      expect(r.status).toBe(400)
    })

    it('PATCH parsial hanya mengubah field yang dikirim', async () => {
      const r = await call<ChannelDTO>(`channels/${channelId}`, { method: 'PATCH', body: { auto: false } })
      expect(r.json.data.auto).toBe(false)
      expect(r.json.data.routes).toHaveLength(2)
      expect(r.json.data.hashtags).toEqual(['#kuliner'])
    })

    it('akun yang hilang dari provider tapi masih dipakai ditandai, yang tidak dipakai dihapus', async () => {
      fakeProviders({ bufferChannels: [] })
      const r = await call<ConnectionDTO>(`connections/${bufferId}/test`, { method: 'POST' })
      expect(r.json.data.profiles.every((p) => p.missing)).toBe(true)
      expect(r.json.data.profiles).toHaveLength(2)
    })

    it('koneksi yang masih dipakai tidak bisa dihapus; setelah channel dihapus bisa', async () => {
      const blocked = await call(`connections/${bufferId}`, { method: 'DELETE' })
      expect(blocked.status).toBe(409)
      expect(blocked.json.error).toMatch(/Dapur Uji/)
      expect((await call(`channels/${channelId}`, { method: 'DELETE' })).status).toBe(200)
      expect((await call(`connections/${bufferId}`, { method: 'DELETE' })).status).toBe(200)
    })
  })

  describe('pengaturan', () => {
    it('mengembalikan nilai bawaan lalu menyimpan perubahan parsial', async () => {
      const before = (await call<SettingsDTO>('settings')).json.data
      expect(before.usdRate).toBe(16500)
      const after = (await call<SettingsDTO>('settings', { method: 'PUT', body: { usdRate: 16200 } })).json.data
      expect(after.usdRate).toBe(16200)
      expect(after.monetizationRules).toEqual(before.monetizationRules)
    })

    it('storage global harus koneksi Cloudinary, dan tidak bisa dihapus selama dipakai sebagai global', async () => {
      expect((await call('settings', { method: 'PUT', body: { globalStorageId: zernioId } })).status).toBe(400)
      expect((await call('settings', { method: 'PUT', body: { globalStorageId: cloudId } })).status).toBe(200)
      const del = await call(`connections/${cloudId}`, { method: 'DELETE' })
      expect(del.status).toBe(409)
      expect(del.json.error).toMatch(/storage global/)
    })

    it('menolak syarat monetisasi dengan metrik yang tidak dikenal', async () => {
      const r = await call('settings', {
        method: 'PUT',
        body: { monetizationRules: [{ platform: 0, program: 'X', all: [{ metric: 'likes', label: 'L', target: 1 }], anyOf: [] }] },
      })
      expect(r.status).toBe(400)
    })
  })
})
