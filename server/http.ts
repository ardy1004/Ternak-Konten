import type { ApiResult } from '../shared/contract.js'

/** Galat yang aman ditampilkan ke operator. Galat lain disamarkan jadi 500. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

export function json<T>(body: ApiResult<T>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } })
}

export const ok = <T>(data: T, headers?: Record<string, string>) => json<T>({ ok: true, data }, 200, headers)
export const fail = (status: number, error: string) => json<never>({ ok: false, error }, status)

const MAX_BODY = 64 * 1024

/** Baca body JSON dengan batas ukuran. Body bukan objek = 400. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw new HttpError(415, 'Body harus JSON')
  const text = await req.text()
  if (text.length > MAX_BODY) throw new HttpError(413, 'Body terlalu besar')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'JSON tidak valid')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'Body harus objek JSON')
  return parsed as Record<string, unknown>
}
