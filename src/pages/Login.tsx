import { useState } from 'react'
import type { Mode } from '../lib/store'

export default function Login({
  onSignIn,
  mode,
  demoReason,
}: {
  onSignIn: (email: string, password: string) => Promise<string | null>
  mode: Mode
  demoReason: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid min-h-screen bg-paper md:grid-cols-2">
      <div className="flex items-end border-b-[1.5px] border-ink p-8 md:border-b-0 md:border-r-[1.5px] md:p-12">
        <h1 className="disp text-[72px] leading-[0.88] md:text-[150px]">Ternak Konten</h1>
      </div>
      <form
        className="flex max-w-md flex-col justify-center gap-4 p-8 md:p-16"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          setBusy(true)
          setError(null)
          const err = await onSignIn(String(f.get('email') ?? ''), String(f.get('password') ?? ''))
          setBusy(false)
          if (err) setError(err)
        }}
      >
        {mode === 'demo' && (
          <p className="rounded-[4px] border-[1.5px] border-amber p-3 text-[13px] text-amber">
            Mode demo — {demoReason}. Isi email & kata sandi apa saja untuk melihat data contoh.
          </p>
        )}
        <label>
          <span className="mb-1 block text-[12px] font-medium">Email</span>
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-medium">Kata sandi</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && (
          <p role="alert" className="text-[13px] text-red">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary justify-center" disabled={busy}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
