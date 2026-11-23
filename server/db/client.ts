import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { env } from '../env.js'
import { HttpError } from '../http.js'
import * as schema from './schema.js'

/*
 * Produksi: Neon lewat HTTP (cocok untuk fungsi serverless — tanpa koneksi
 * panjang). Driver HTTP TIDAK mendukung transaksi interaktif, jadi kode yang
 * menulis beberapa baris disusun supaya kegagalan di tengah jalan tetap aman
 * (mis. tambah dulu, baru hapus).
 *
 * Tes & pengembangan lokal memasang PGlite lewat setDb().
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, any>

let current: Db | null = null

export function setDb(db: Db | null) {
  current = db
}

export function getDb(): Db {
  if (current) return current
  const url = env().databaseUrl
  if (!url) throw new HttpError(503, 'Database belum diatur (DATABASE_URL kosong)')
  current = drizzle(neon(url), { schema }) as unknown as Db
  return current
}

export const hasDbConfig = () => Boolean(current) || Boolean(env().databaseUrl)
