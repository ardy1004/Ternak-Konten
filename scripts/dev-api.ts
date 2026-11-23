/*
 * Server API lokal untuk pengembangan: `pnpm dev:api` (port 3001), dipasangkan
 * dengan `pnpm dev` — Vite meneruskan /api ke sini.
 *
 * Tanpa DATABASE_URL: memakai PGlite (Postgres di dalam proses) di folder .data/,
 * plus kredensial operator khusus lokal yang dicetak di terminal. Dengan
 * DATABASE_URL: memakai database itu dan secret dari env/.env.local.
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* opsional */
}

const PORT = 3001
const usingLocalDb = !process.env.DATABASE_URL && !process.env.POSTGRES_URL

if (usingLocalDb) {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const schema = await import('../server/db/schema.js')
  const { setDb } = await import('../server/db/client.js')
  mkdirSync('.data', { recursive: true })
  const db = drizzle(new PGlite('.data/pglite'), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' })
  setDb(db as never)

  // Kredensial LOKAL saja — hanya dipakai bila database lokal juga dipakai.
  if (!process.env.OPERATOR_EMAIL) {
    const { hashPassword } = await import('../server/crypto.js')
    process.env.OPERATOR_EMAIL = 'operator@lokal.test'
    process.env.OPERATOR_PASSWORD_HASH = await hashPassword('lokal-ternak-konten')
    process.env.SESSION_SECRET = randomBytes(48).toString('base64url')
    // Kunci tetap supaya secret di .data/pglite tetap terbaca setelah server dimulai ulang.
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
    console.log('Masuk lokal: operator@lokal.test / lokal-ternak-konten')
  }
}

const { handle } = await import('../server/app.js')
const { toNodeHandler } = await import('../server/node-handler.js')

// Jembatan yang sama dengan fungsi Vercel. router.ts membaca jalur dari pathname
// (/api/x) maupun dari ?route=x, jadi rewrite Vercel tidak perlu ditiru di sini.
createServer(toNodeHandler(handle)).listen(PORT, () =>
  console.log(`API lokal di http://localhost:${PORT} (${usingLocalDb ? 'PGlite .data/pglite' : 'DATABASE_URL'})`),
)
