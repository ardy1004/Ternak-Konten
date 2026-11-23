/*
 * Cek isi database tanpa mengubah apa pun:
 *   pnpm db:cek
 * Menampilkan tabel yang ada, migrasi yang sudah diterapkan, dan jumlah baris per tabel.
 * Alamat database tidak pernah dicetak.
 */
import { neon } from '@neondatabase/serverless'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* tidak ada .env.local — pakai env yang sudah ada */
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) {
  console.error('DATABASE_URL belum diisi.')
  process.exit(1)
}

const sql = neon(url)
const tables = (await sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`) as {
  table_name: string
}[]
console.log('Tabel:', tables.map((t) => t.table_name).join(', ') || '(kosong)')

const migrated = (await sql`select count(*)::int as n from drizzle.__drizzle_migrations`.catch(() => [{ n: 0 }])) as { n: number }[]
console.log('Migrasi diterapkan:', migrated[0]?.n ?? 0)

for (const t of tables) {
  const rows = (await sql.query(`select count(*)::int as n from "${t.table_name.replace(/"/g, '')}"`)) as { n: number }[]
  console.log(`  ${t.table_name.padEnd(18)} ${rows[0]?.n ?? 0} baris`)
}
