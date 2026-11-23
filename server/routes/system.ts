import { sql } from 'drizzle-orm'
import type { HealthDTO } from '../../shared/contract.js'
import { verifyPassword } from '../crypto.js'
import { getDb, hasDbConfig } from '../db/client.js'
import { authConfigured, env } from '../env.js'
import { HttpError, ok, readJson } from '../http.js'
import { route } from '../router.js'
import { clearCookie, createSession, requireOperator, sessionCookie } from '../session.js'
import { str } from '../validate.js'

/** Hasil execute() berbeda antar-driver (neon-http vs PGlite) — baca baris pertama dengan aman. */
export function firstRow(result: unknown): Record<string, unknown> | undefined {
  const r = result as { rows?: Record<string, unknown>[] } | Record<string, unknown>[]
  return Array.isArray(r) ? r[0] : r.rows?.[0]
}

// Publik: frontend memakainya untuk memilih mode demo atau mode sungguhan.
route(
  'GET',
  '/health',
  async () => {
    const auth = authConfigured()
    if (!hasDbConfig()) return ok<HealthDTO>({ db: 'missing-env', auth })
    try {
      const row = firstRow(await getDb().execute(sql`select to_regclass('public.connections')::text as t`))
      return ok<HealthDTO>({ db: row?.t ? 'ok' : 'not-migrated', auth })
    } catch (err) {
      console.error('[api] health db', err)
      return ok<HealthDTO>({ db: 'unreachable', auth })
    }
  },
  { public: true },
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

route(
  'POST',
  '/auth/login',
  async ({ req }) => {
    if (!authConfigured()) throw new HttpError(503, 'Login belum diatur di server (lihat SETUP.md)')
    const body = await readJson(req)
    const email = str(body, 'email', 'Email', { required: true, max: 200 }).toLowerCase()
    const password = str(body, 'password', 'Kata sandi', { required: true, max: 200 })
    const e = env()
    // Hash selalu dihitung, juga saat email salah, supaya waktu respons tidak membocorkan email yang benar.
    const passOk = await verifyPassword(password, e.operatorPasswordHash)
    if (!passOk || email !== e.operatorEmail) {
      await sleep(400)
      throw new HttpError(401, 'Email atau kata sandi salah')
    }
    const token = await createSession(e.operatorEmail)
    return ok({ email: e.operatorEmail }, { 'Set-Cookie': sessionCookie(token) })
  },
  { public: true },
)

route('POST', '/auth/logout', async () => ok(null, { 'Set-Cookie': clearCookie() }), { public: true })

route('GET', '/auth/me', async ({ req }) => ok({ email: await requireOperator(req) }))
