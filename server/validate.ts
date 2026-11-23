import { HttpError } from './http.js'

/*
 * Validator kecil untuk body JSON. Sengaja tanpa pustaka: payload aplikasi ini
 * kecil, dan pesan galat ditulis dalam bahasa operator.
 */

type Body = Record<string, unknown>

export function str(body: Body, key: string, label: string, opts: { max?: number; required?: boolean; def?: string } = {}) {
  const v = body[key]
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new HttpError(400, `${label} wajib diisi`)
    return opts.def ?? ''
  }
  if (typeof v !== 'string') throw new HttpError(400, `${label} harus teks`)
  const t = v.trim()
  if (opts.required && !t) throw new HttpError(400, `${label} wajib diisi`)
  if (t.length > (opts.max ?? 200)) throw new HttpError(400, `${label} terlalu panjang (maks ${opts.max ?? 200} karakter)`)
  return t
}

export function num(body: Body, key: string, label: string, opts: { min?: number; max?: number; int?: boolean; def?: number } = {}) {
  const v = body[key]
  if (v === undefined || v === null || v === '') {
    if (opts.def !== undefined) return opts.def
    throw new HttpError(400, `${label} wajib diisi`)
  }
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new HttpError(400, `${label} harus angka`)
  if (opts.int && !Number.isInteger(n)) throw new HttpError(400, `${label} harus bilangan bulat`)
  if (opts.min !== undefined && n < opts.min) throw new HttpError(400, `${label} minimal ${opts.min}`)
  if (opts.max !== undefined && n > opts.max) throw new HttpError(400, `${label} maksimal ${opts.max}`)
  return n
}

export function bool(body: Body, key: string, def: boolean) {
  const v = body[key]
  if (v === undefined) return def
  if (typeof v !== 'boolean') throw new HttpError(400, `${key} harus true/false`)
  return v
}

export function oneOf<T extends string>(body: Body, key: string, label: string, options: readonly T[], def?: T): T {
  const v = body[key]
  if (v === undefined && def !== undefined) return def
  if (typeof v !== 'string' || !options.includes(v as T)) throw new HttpError(400, `${label} harus salah satu dari: ${options.join(', ')}`)
  return v as T
}

export function strArray(body: Body, key: string, label: string, opts: { maxItems: number; maxLen: number; pattern?: RegExp }) {
  const v = body[key]
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new HttpError(400, `${label} harus daftar`)
  if (v.length > opts.maxItems) throw new HttpError(400, `${label} maksimal ${opts.maxItems} butir`)
  return v.map((x) => {
    if (typeof x !== 'string' || !x.trim() || x.length > opts.maxLen) throw new HttpError(400, `Isi ${label} tidak valid`)
    if (opts.pattern && !opts.pattern.test(x)) throw new HttpError(400, `Format ${label} tidak valid: ${x}`)
    return x.trim()
  })
}

/** True bila kunci ada di body — untuk PATCH parsial. */
export const has = (body: Body, key: string) => Object.prototype.hasOwnProperty.call(body, key)
