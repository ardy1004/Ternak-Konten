/*
 * Susun deployment Vercel lewat Build Output API v3:
 *   .vercel/output/static/          ← hasil `vite build` (dist/)
 *   .vercel/output/functions/api.func/index.mjs  ← SELURUH server dibundel jadi satu file
 *   .vercel/output/config.json      ← routing: /api/* ke fungsi, lalu file statis, lalu SPA
 *
 * Kenapa tidak memakai folder api/ biasa: fungsi di api/ yang mengimpor file di luar
 * api/ dilaporkan gagal di runtime (ERR_MODULE_NOT_FOUND) walau build sukses. Dengan
 * bundel satu file, tidak ada impor yang perlu dipecahkan Vercel.
 *
 * Dipanggil oleh `pnpm build:vercel` (perintah build di vercel.json).
 */
import { build } from 'esbuild'
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '.vercel/output'
const FUNC = join(OUT, 'functions/api.func')

if (!existsSync('dist/index.html')) {
  console.error('dist/ belum ada — jalankan `vite build` dulu (pnpm build:vercel melakukannya).')
  process.exit(1)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(FUNC, { recursive: true })
cpSync('dist', join(OUT, 'static'), { recursive: true })

await build({
  entryPoints: ['server/vercel-entry.ts'],
  outfile: join(FUNC, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Tidak diminify: stack trace di log Vercel tetap terbaca.
  minify: false,
  keepNames: true,
  sourcemap: 'linked',
  // Sebagian dependensi CommonJS memanggil require(); sediakan di dalam bundel ESM.
  banner: { js: "import { createRequire as __tkCreateRequire } from 'node:module'; const require = __tkCreateRequire(import.meta.url);" },
  logLevel: 'warning',
})

writeFileSync(join(FUNC, 'package.json'), JSON.stringify({ type: 'module' }))
writeFileSync(
  join(FUNC, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      shouldAddSourcemapSupport: true,
      // Batas paket Hobby (fluid compute) = 300 detik.
      maxDuration: 60,
      // Satu region, dekat database Neon (Singapura). Tanpa ini fungsi jalan di iad1
      // (AS) dan setiap query menyeberang Pasifik — terjadi di deploy pertama.
      regions: ['sin1'],
    },
    null,
    2,
  ),
)

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

writeFileSync(
  join(OUT, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: SECURITY_HEADERS, continue: true },
        // Aset ber-hash dari Vite boleh di-cache selamanya; index.html tidak. Harus SEBELUM
        // fase filesystem — route sesudahnya hanya dicek bila file tidak ditemukan.
        { src: '^/assets/(.*)$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
        // Semua API ke satu fungsi; jalurnya dibawa sebagai ?route= (server/router.ts membaca keduanya).
        { src: '^/api/(.*)$', dest: '/api?route=$1' },
        { handle: 'filesystem' },
        // SPA: jalur yang bukan file dan bukan API dilayani index.html.
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
)

const kb = (p: string) => `${Math.round(statSync(p).size / 1024)} KB`
console.log(`Build Output siap: static ← dist/, fungsi api.func/index.mjs (${kb(join(FUNC, 'index.mjs'))})`)
