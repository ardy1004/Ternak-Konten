import { platformIndex, type ProviderName } from '../shared/contract.js'

/*
 * Klien minimal ke Buffer, Zernio, dan Cloudinary — hanya untuk menguji kredensial
 * dan membaca akun tertaut/kuota. Pengiriman post menyusul di tahap penjadwal.
 *
 * Setiap fungsi MENGEMBALIKAN hasil (tidak melempar) dengan pesan galat yang bisa
 * ditampilkan ke operator. Secret tidak pernah ikut masuk ke pesan galat.
 */

export interface Secret {
  apiKey: string
  apiSecret?: string
}

export interface FoundProfile {
  externalId: string
  platform: number
  handle: string
}

export interface TestResult {
  ok: boolean
  error: string | null
  profiles: FoundProfile[]
  usage: { used: number; limit: number } | null
}

const TIMEOUT = 15_000
const fail = (error: string): TestResult => ({ ok: false, error, profiles: [], usage: null })

function httpError(name: string, status: number) {
  if (status === 401 || status === 403) return `API key ditolak ${name} (${status})`
  if (status === 404) return `${name} tidak menemukan akun (404)`
  if (status === 429) return `${name} membatasi permintaan (429), coba lagi sebentar`
  return `${name} membalas HTTP ${status}`
}

async function call(name: string, url: string, init: RequestInit): Promise<{ status: number; body: unknown } | { error: string }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'TimeoutError'
    return { error: timeout ? `${name} tidak menjawab dalam ${TIMEOUT / 1000} detik` : `Gagal menghubungi ${name}` }
  }
}

/** Ambil string dari kandidat pertama yang benar-benar string; objek {name}/{id} dibuka satu tingkat. */
function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
    if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>
      if (typeof o.name === 'string' && o.name) return o.name
      if (typeof o.id === 'string' && o.id) return o.id
    }
  }
  return null
}

// ─── Buffer (GraphQL, https://api.buffer.com) ─────────────────────────────────

async function buffer(secret: Secret): Promise<TestResult> {
  const gql = (query: string, variables?: Record<string, unknown>) =>
    call('Buffer', 'https://api.buffer.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret.apiKey}` },
      body: JSON.stringify({ query, variables }),
    })

  const orgRes = await gql('query { account { organizations { id name } } }')
  if ('error' in orgRes) return fail(orgRes.error)
  const orgBody = orgRes.body as { data?: { account?: { organizations?: { id: string }[] } }; errors?: { message: string }[] } | null
  if (orgRes.status !== 200 || !orgBody) return fail(httpError('Buffer', orgRes.status))
  if (orgBody.errors?.length)
    return fail(
      `Buffer: ${orgBody.errors
        .map((e) => e.message)
        .join('; ')
        .slice(0, 200)}`,
    )
  const orgs = orgBody.data?.account?.organizations ?? []
  if (orgs.length === 0) return fail('Buffer: tidak ada organisasi di akun ini')

  const profiles: FoundProfile[] = []
  for (const org of orgs) {
    const chRes = await gql(
      'query GetChannels($organizationId: OrganizationId!) { channels(input: { organizationId: $organizationId }) { id name service } }',
      {
        organizationId: org.id,
      },
    )
    if ('error' in chRes) return fail(chRes.error)
    const chBody = chRes.body as { data?: { channels?: { id: string; name: string; service: string }[] } } | null
    for (const ch of chBody?.data?.channels ?? []) {
      const platform = platformIndex(ch.service)
      if (platform >= 0 && ch.id) profiles.push({ externalId: String(ch.id), platform, handle: ch.name || String(ch.id) })
    }
  }
  return { ok: true, error: null, profiles, usage: null }
}

// ─── Zernio (REST, https://zernio.com/api/v1) ─────────────────────────────────

async function zernio(secret: Secret): Promise<TestResult> {
  const res = await call('Zernio', 'https://zernio.com/api/v1/accounts', { headers: { Authorization: `Bearer ${secret.apiKey}` } })
  if ('error' in res) return fail(res.error)
  if (res.status !== 200 || !res.body) return fail(httpError('Zernio', res.status))
  // Bentuk respons tidak seragam: daftar bisa di `accounts`, `data.accounts`, atau `data`,
  // dan beberapa field berupa objek bersarang. Semua dibaca lewat pickString.
  const b = res.body as Record<string, unknown>
  const data = b.data as Record<string, unknown> | unknown[] | undefined
  const list = (
    Array.isArray(b.accounts)
      ? b.accounts
      : Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.accounts)
          ? (data as Record<string, unknown>).accounts
          : []
  ) as Record<string, unknown>[]
  const profiles: FoundProfile[] = []
  for (const a of list) {
    const externalId = pickString(a.accountId, a._id, a.id, a.account_id, a.profileId)
    const platform = platformIndex(pickString(a.platform, a.type))
    const username = pickString(a.username)
    const handle = username
      ? username.startsWith('@')
        ? username
        : `@${username}`
      : pickString(a.name, a.displayName, a.display_name, a.pageName)
    if (externalId && platform >= 0) profiles.push({ externalId, platform, handle: handle ?? externalId })
  }
  return { ok: true, error: null, profiles, usage: null }
}

// ─── Cloudinary (Admin API usage) ─────────────────────────────────────────────

async function cloudinary(secret: Secret, cloudName: string): Promise<TestResult> {
  if (!/^[a-z0-9_-]+$/i.test(cloudName)) return fail('Cloud name hanya boleh huruf, angka, - dan _')
  if (!secret.apiSecret) return fail('API secret Cloudinary wajib diisi')
  const auth = Buffer.from(`${secret.apiKey}:${secret.apiSecret}`).toString('base64')
  const res = await call('Cloudinary', `https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if ('error' in res) return fail(res.error)
  if (res.status === 401) return fail('API key atau API secret Cloudinary salah (401)')
  if (res.status !== 200 || !res.body) return fail(httpError('Cloudinary', res.status))
  const credits = (res.body as { credits?: { usage?: number; limit?: number } }).credits
  const usage =
    credits && typeof credits.usage === 'number' && typeof credits.limit === 'number' ? { used: credits.usage, limit: credits.limit } : null
  return { ok: true, error: null, profiles: [], usage }
}

export async function testConnection(provider: ProviderName, secret: Secret, cloudName: string | null): Promise<TestResult> {
  if (!secret.apiKey) return fail('API key wajib diisi')
  if (provider === 'Buffer') return buffer(secret)
  if (provider === 'Zernio') return zernio(secret)
  return cloudinary(secret, cloudName ?? '')
}
