import { fail, HttpError } from './http.js'
import { requireOperator } from './session.js'

export interface Ctx {
  req: Request
  params: Record<string, string>
}
type Handler = (ctx: Ctx) => Promise<Response>

interface RouteDef {
  method: string
  re: RegExp
  keys: string[]
  handler: Handler
  public: boolean
}

const table: RouteDef[] = []

/** Daftarkan route. Default WAJIB masuk; publik harus dinyatakan eksplisit. */
export function route(method: string, path: string, handler: Handler, opts: { public?: boolean } = {}) {
  const keys: string[] = []
  const re = new RegExp(
    '^' +
      path.replace(/:([a-zA-Z]+)/g, (_, k: string) => {
        keys.push(k)
        return '([^/]+)'
      }) +
      '$',
  )
  table.push({ method, re, keys, handler, public: Boolean(opts.public) })
}

/**
 * Semua /api/* masuk ke SATU fungsi Vercel (vercel.json menulis ulang ke /api?route=…),
 * jadi paket Hobby tidak pernah menyentuh batas 12 fungsi per deployment.
 */
export function routePath(url: URL) {
  const raw = url.searchParams.get('route') ?? url.pathname.replace(/^\/api\/?/, '')
  return '/' + raw.replace(/^\/+|\/+$/g, '')
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function dispatch(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = routePath(url)

  // Pertahanan CSRF lapis kedua (lapis pertama: cookie SameSite=Strict): Origin harus
  // sama dengan host yang diminta. Host dibaca dari header juga, karena di balik proxy
  // URL fungsi bisa memakai host internal.
  if (MUTATING.has(req.method)) {
    const origin = req.headers.get('origin')
    const hosts = new Set([url.host, req.headers.get('x-forwarded-host'), req.headers.get('host')].filter(Boolean))
    let originHost = ''
    try {
      originHost = origin ? new URL(origin).host : ''
    } catch {
      return fail(403, 'Asal permintaan tidak diizinkan')
    }
    if (origin && !hosts.has(originHost)) return fail(403, 'Asal permintaan tidak diizinkan')
  }

  const candidates = table.filter((r) => r.re.test(path))
  if (candidates.length === 0) return fail(404, 'Endpoint tidak ada')
  const match = candidates.find((r) => r.method === req.method)
  if (!match) return fail(405, 'Metode tidak diizinkan')

  const values = path.match(match.re)!.slice(1)
  const params = Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(values[i])]))
  try {
    if (!match.public) await requireOperator(req)
    return await match.handler({ req, params })
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.message)
    console.error(`[api] ${req.method} ${path}`, err)
    return fail(500, 'Terjadi kesalahan di server')
  }
}
