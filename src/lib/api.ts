import type { ApiResult, ChannelDTO, ConnectionDTO, HealthDTO, SettingsDTO } from '../../shared/contract'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Panggil /api/<path>. Mengembalikan `data` dari amplop {ok,data}; selain itu melempar
 * ApiError dengan pesan yang siap ditampilkan. Bentuk amplop DIPERIKSA, bukan dipercaya.
 */
export async function api<T>(path: string, opts: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/${path}`, {
      method: opts.method ?? 'GET',
      headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
    })
  } catch {
    throw new ApiError(0, 'Tidak bisa menghubungi server')
  }
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* bukan JSON */
  }
  if (!json || typeof json !== 'object' || !('ok' in json))
    throw new ApiError(res.status, `Server membalas HTTP ${res.status} tanpa data yang bisa dibaca`)
  const r = json as ApiResult<T>
  if (!r.ok) throw new ApiError(res.status, typeof r.error === 'string' ? r.error : 'Permintaan gagal')
  return r.data
}

export type ModeCheck = { mode: 'live' } | { mode: 'demo'; reason: string }

/** Mode sungguhan hanya bila database siap DAN secret login terpasang. Selain itu demo, dengan alasannya. */
export async function detectMode(): Promise<ModeCheck> {
  try {
    const h = await api<HealthDTO>('health', { timeoutMs: 6000 })
    if (h.db === 'ok' && h.auth) return { mode: 'live' }
    const reason =
      h.db === 'missing-env'
        ? 'database belum diatur'
        : h.db === 'not-migrated'
          ? 'migrasi database belum dijalankan'
          : h.db === 'unreachable'
            ? 'database tidak bisa dihubungi'
            : 'secret login belum diatur'
    return { mode: 'demo', reason }
  } catch {
    return { mode: 'demo', reason: 'server API tidak aktif' }
  }
}

export async function loadLive() {
  const [connections, channels, settings] = await Promise.all([
    api<ConnectionDTO[]>('connections'),
    api<ChannelDTO[]>('channels'),
    api<SettingsDTO>('settings'),
  ])
  if (
    !Array.isArray(connections) ||
    !Array.isArray(channels) ||
    !settings ||
    typeof settings !== 'object' ||
    !Array.isArray(settings.monetizationRules)
  )
    throw new ApiError(500, 'Bentuk data dari server tidak sesuai')
  return { connections, channels, settings }
}

/** Pesan galat yang aman ditampilkan dari apa pun yang dilempar. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan')
