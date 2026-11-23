/**
 * Baca satu variabel env, dibersihkan dari kesalahan tempel yang umum saat mengisi
 * dashboard Vercel: spasi/baris baru di tepi, tanda kutip pembungkus, dan awalan
 * "NAMA=" (baris hasil `pnpm env:siapkan` tertempel utuh ke kolom nilai).
 */
function read(name: string) {
  let v = (process.env[name] ?? '').trim()
  if (v.startsWith(`${name}=`)) v = v.slice(name.length + 1).trim()
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1).trim()
  return v
}

/** Semua konfigurasi server dibaca dari env di satu tempat. Nilai dibaca ulang tiap panggilan supaya mudah diuji. */
export function env() {
  return {
    databaseUrl: read('DATABASE_URL') || read('POSTGRES_URL'),
    operatorEmail: read('OPERATOR_EMAIL').toLowerCase(),
    operatorPasswordHash: read('OPERATOR_PASSWORD_HASH'),
    sessionSecret: read('SESSION_SECRET'),
    encryptionKey: read('ENCRYPTION_KEY'),
  }
}

/**
 * Masalah konfigurasi login, sebagai kalimat yang menyebut NAMA variabel dan aturannya
 * saja — tidak pernah nilainya. Kosong = login siap dipakai.
 */
export function authProblems(): string[] {
  const e = env()
  const out: string[] = []
  if (!/^[^@\s]+@[^@\s]+$/.test(e.operatorEmail)) out.push('OPERATOR_EMAIL kosong atau bukan alamat email')
  if (!e.operatorPasswordHash.startsWith('scrypt:') || e.operatorPasswordHash.split(':').length !== 6)
    out.push('OPERATOR_PASSWORD_HASH kosong atau bukan hasil pnpm env:siapkan (harus diawali scrypt:)')
  if (e.sessionSecret.length < 32) out.push('SESSION_SECRET kosong atau kurang dari 32 karakter')
  if (Buffer.from(e.encryptionKey, 'base64').length !== 32) out.push('ENCRYPTION_KEY kosong atau bukan kunci 32 byte (base64)')
  return out
}

/** Login & enkripsi hanya boleh jalan bila keempat secret valid. */
export const authConfigured = () => authProblems().length === 0
