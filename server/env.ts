/** Semua konfigurasi server dibaca dari env di satu tempat. Nilai dibaca ulang tiap panggilan supaya mudah diuji. */
export function env() {
  return {
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
    operatorEmail: (process.env.OPERATOR_EMAIL || '').trim().toLowerCase(),
    operatorPasswordHash: process.env.OPERATOR_PASSWORD_HASH || '',
    sessionSecret: process.env.SESSION_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  }
}

/** Login & enkripsi hanya boleh jalan bila keempat secret terisi dengan panjang yang layak. */
export function authConfigured() {
  const e = env()
  return Boolean(
    e.operatorEmail && e.operatorPasswordHash.startsWith('scrypt:') && e.sessionSecret.length >= 32 && e.encryptionKey.length >= 40,
  )
}
