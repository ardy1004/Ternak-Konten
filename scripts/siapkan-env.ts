/*
 * Buat nilai env rahasia untuk Vercel.
 *   pnpm env:siapkan
 * Menanyakan email & kata sandi operator, lalu menyalin keempat nilai ke clipboard
 * SATU PER SATU (tekan Enter di antaranya) untuk ditempel ke Vercel → Settings →
 * Environment Variables. Tidak ada yang disimpan ke disk.
 *
 * Kenapa lewat clipboard: OPERATOR_PASSWORD_HASH panjangnya >100 karakter. Saat diblok
 * dari terminal ia mudah terpotong atau tersisip baris baru, dan hasilnya login tidak
 * pernah aktif — terjadi di deploy pertama.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { hashPassword } from '../server/crypto.js'

// Baca jawaban lewat iterator baris: rl.question() kehilangan baris yang datang sekaligus
// (mis. lewat pipa), sedangkan iterator menyangganya. Aman untuk ketikan maupun pipa.
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
const lines = rl[Symbol.asyncIterator]()
async function ask(question: string) {
  process.stdout.write(question)
  const next = await lines.next()
  return next.done ? '' : next.value
}

const email = (await ask('Email operator: ')).trim().toLowerCase()
const password = await ask('Kata sandi (minimal 12 karakter): ')

if (!/^[^@\s]+@[^@\s]+$/.test(email)) {
  console.error('Email tidak valid.')
  process.exit(1)
}
if (password.length < 12) {
  console.error('Kata sandi minimal 12 karakter.')
  process.exit(1)
}
// Halaman login terbuka untuk siapa saja; kata sandi yang memuat email (atau nama sebelum @)
// adalah tebakan pertama. Pernah terjadi: kata sandi diisi persis sama dengan emailnya.
const localPart = email.split('@')[0]
if (password.toLowerCase().includes(email) || (localPart.length >= 4 && password.toLowerCase().includes(localPart))) {
  console.error(`Kata sandi tidak boleh memuat email atau "${localPart}" — terlalu mudah ditebak.`)
  process.exit(1)
}

const values: [string, string][] = [
  ['OPERATOR_EMAIL', email],
  ['OPERATOR_PASSWORD_HASH', await hashPassword(password)],
  ['SESSION_SECRET', randomBytes(48).toString('base64url')],
  ['ENCRYPTION_KEY', randomBytes(32).toString('base64')],
]

/** Salin ke clipboard sistem. false bila tidak tersedia. */
function copy(text: string) {
  const cmd = process.platform === 'win32' ? ['clip'] : process.platform === 'darwin' ? ['pbcopy'] : ['xclip', '-selection', 'clipboard']
  const r = spawnSync(cmd[0], cmd.slice(1), { input: text })
  return r.status === 0
}

const mode = (await ask('\nSalin ke clipboard satu per satu? (Y/n) ')).trim().toLowerCase()
if (mode !== 'n' && copy('')) {
  console.log('\nDi Vercel → Settings → Environment Variables, untuk tiap variabel:')
  console.log('  ketik NAMA-nya di kolom Key, tempel (Ctrl+V) di kolom Value, centang Production, Save.\n')
  for (const [name, value] of values) {
    await ask(`Tekan Enter untuk menyalin nilai ${name} …`)
    copy(value)
    console.log(`  ✓ ${name} tersalin (${value.length} karakter). Tempel ke kolom Value di Vercel.`)
  }
  copy('')
  console.log('\nClipboard sudah dikosongkan lagi.')
  if ((await ask('Tampilkan ENCRYPTION_KEY sekali untuk disimpan ke password manager? (y/N) ')).trim().toLowerCase() === 'y')
    console.log(`ENCRYPTION_KEY=${values[3][1]}`)
} else {
  console.log('\nTempel ke Vercel → Settings → Environment Variables (Production):\n')
  for (const [name, value] of values) console.log(`${name}=${value}`)
}
rl.close()

console.log('\nPENTING: simpan ENCRYPTION_KEY di tempat aman. Kalau hilang, semua API key yang tersimpan tidak bisa dibuka lagi.')
console.log('Setelah semua variabel tersimpan: Deployments → ⋯ → Redeploy (variabel baru hanya berlaku setelah deploy ulang).')
