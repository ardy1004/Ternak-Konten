/*
 * Buat nilai env rahasia untuk Vercel.
 *   pnpm env:siapkan
 * Menanyakan email & kata sandi operator, lalu mencetak 4 baris untuk ditempel
 * ke Vercel → Settings → Environment Variables. Tidak ada yang disimpan ke disk.
 */
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { hashPassword } from '../server/crypto.js'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const email = (await rl.question('Email operator: ')).trim().toLowerCase()
const password = await rl.question('Kata sandi (minimal 12 karakter): ')
rl.close()

if (!email.includes('@')) {
  console.error('Email tidak valid.')
  process.exit(1)
}
if (password.length < 12) {
  console.error('Kata sandi minimal 12 karakter.')
  process.exit(1)
}

console.log('\nTempel ke Vercel → Settings → Environment Variables (Production):\n')
console.log(`OPERATOR_EMAIL=${email}`)
console.log(`OPERATOR_PASSWORD_HASH=${await hashPassword(password)}`)
console.log(`SESSION_SECRET=${randomBytes(48).toString('base64url')}`)
console.log(`ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`)
console.log('\nPENTING: simpan ENCRYPTION_KEY di tempat aman. Kalau hilang, semua API key yang tersimpan tidak bisa dibuka lagi.')
