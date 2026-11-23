import type { IncomingMessage, ServerResponse } from 'node:http'

type FetchHandler = (req: Request) => Promise<Response>

/**
 * Jembatan Node (req, res) ↔ Web Request/Response. Dipakai fungsi Vercel
 * (lihat scripts/build-vercel.ts) DAN server lokal (scripts/dev-api.ts) — satu
 * jalur yang sama, supaya yang diuji lokal persis yang jalan di produksi.
 */
export function toNodeHandler(handle: FetchHandler) {
  return async function nodeHandler(req: IncomingMessage, res: ServerResponse) {
    try {
      const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? 'http'
      const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost'
      const url = new URL(req.url ?? '/', `${proto}://${host}`)

      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)

      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0

      const response = await handle(new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }))

      // Set-Cookie bisa lebih dari satu — wajib dikirim terpisah, bukan digabung koma.
      const out: Record<string, string | string[]> = {}
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') out[key] = value
      })
      const cookies = response.headers.getSetCookie()
      if (cookies.length) out['set-cookie'] = cookies
      res.writeHead(response.status, out)
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (err) {
      console.error('[api] adapter', err)
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: 'Terjadi kesalahan di server' }))
    }
  }
}
