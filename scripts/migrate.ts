/*
 * Terapkan migrasi di folder drizzle/ ke database Neon.
 *   pnpm db:migrate
 * DATABASE_URL dibaca dari env atau dari .env.local (mis. hasil `vercel env pull .env.local`).
 * Aman dijalankan berulang: migrasi yang sudah diterapkan dilewati.
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* tidak ada .env.local — pakai env yang sudah ada */
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) {
  console.error('DATABASE_URL belum diisi. Isi di .env.local atau jalankan: vercel env pull .env.local')
  process.exit(1)
}

await migrate(drizzle(neon(url)), { migrationsFolder: 'drizzle' })
console.log('Migrasi selesai.')
