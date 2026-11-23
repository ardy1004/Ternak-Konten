import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { env } from './env.js'

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))))

// ─── Kata sandi operator ──────────────────────────────────────────────────────
// Format: scrypt:N:r:p:saltBase64:hashBase64. Parameter disimpan bersama hash supaya
// bisa dinaikkan kelak tanpa mematahkan hash lama. Pemisahnya ':' (bukan '$') karena
// '$' bisa diubah diam-diam oleh shell atau pemuat .env saat nilainya ditempel.

const N = 2 ** 15
const R = 8
const P = 1
const KEYLEN = 32
const MAXMEM = 64 * 1024 * 1024

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM })
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join(':')
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = parts
  const expected = Buffer.from(hashB64, 'base64')
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +r, p: +p, maxmem: MAXMEM })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

// ─── Enkripsi secret koneksi ──────────────────────────────────────────────────
// AES-256-GCM. Format: v1.iv.tag.ciphertext (base64url). Kunci 32 byte, base64 di ENCRYPTION_KEY.

function key() {
  const k = Buffer.from(env().encryptionKey, 'base64')
  if (k.length !== 32) throw new Error('ENCRYPTION_KEY harus 32 byte dalam base64')
  return k
}

export function encryptJson(value: unknown) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function decryptJson<T>(payload: string): T {
  const [v, iv, tag, ct] = payload.split('.')
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Format secret tidak dikenal')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  const plain = Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()])
  return JSON.parse(plain.toString('utf8')) as T
}

export const newId = (prefix: string) => `${prefix}_${randomBytes(6).toString('base64url')}`
