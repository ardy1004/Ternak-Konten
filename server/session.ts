import { jwtVerify, SignJWT } from 'jose'
import { env } from './env.js'
import { HttpError } from './http.js'

/*
 * Sesi operator = JWT HS256 di cookie httpOnly.
 * SETIAP token wajib ber-scope dan setiap verifikasi wajib menyebut scope yang
 * diharapkan: kelak akan ada token lain (mis. tautan publik) yang ditandatangani
 * secret yang sama — tanda tangan sah BUKAN bukti jenis token.
 */

export const COOKIE = 'tk_sesi'
const SCOPE_OPERATOR = 'operator'
const MAX_AGE = 60 * 60 * 24 * 7

const secret = () => new TextEncoder().encode(env().sessionSecret)

export async function signToken(subject: string, scope: string, maxAgeSec: number) {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret())
}

/** Verifikasi tanda tangan, kedaluwarsa, DAN scope. Scope wajib diisi pemanggil. */
export async function verifyToken(token: string, requiredScope: string) {
  if (!requiredScope) throw new Error('verifyToken wajib diberi scope')
  const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
  if (payload.scope !== requiredScope || typeof payload.sub !== 'string') throw new Error('Scope token salah')
  return payload.sub
}

export const sessionCookie = (token: string) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

export const createSession = (email: string) => signToken(email, SCOPE_OPERATOR, MAX_AGE)

function readCookie(req: Request, name: string) {
  const raw = req.headers.get('cookie') || ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

/** Email operator dari sesi yang sah, atau 401. Email juga harus masih sama dengan OPERATOR_EMAIL. */
export async function requireOperator(req: Request) {
  const token = readCookie(req, COOKIE)
  if (!token) throw new HttpError(401, 'Belum masuk')
  let sub: string
  try {
    sub = await verifyToken(token, SCOPE_OPERATOR)
  } catch {
    throw new HttpError(401, 'Sesi tidak sah atau kedaluwarsa')
  }
  if (sub !== env().operatorEmail) throw new HttpError(401, 'Sesi tidak sah atau kedaluwarsa')
  return sub
}
