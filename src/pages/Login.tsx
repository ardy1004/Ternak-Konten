import { useState } from 'react'

export default function Login({ onSignIn }: { onSignIn: () => void }) {
  const [error, setError] = useState(false)
  return (
    <div className="grid min-h-screen bg-paper md:grid-cols-2">
      <div className="flex items-end border-b-[1.5px] border-ink p-8 md:border-b-0 md:border-r-[1.5px] md:p-12">
        <h1 className="disp text-[72px] leading-[0.88] md:text-[150px]">Ternak Konten</h1>
      </div>
      <form
        className="flex max-w-md flex-col justify-center gap-4 p-8 md:p-16"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          // Sementara: belum ada backend. Kata sandi "salah" memperagakan keadaan galat.
          if (f.get('password') === 'salah') setError(true)
          else onSignIn()
        }}
      >
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
            Email atau kata sandi salah
          </p>
        )}
        <button type="submit" className="btn btn-primary justify-center">
          Masuk
        </button>
      </form>
    </div>
  )
}
