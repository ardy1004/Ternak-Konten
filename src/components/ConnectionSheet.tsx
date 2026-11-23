import { useState } from 'react'
import { useApp } from '../app/context'
import { findConnection } from '../lib/mock'
import type { ConnectionProvider } from '../lib/types'
import { Icon } from './Icon'
import { Field, Seg, Sheet } from './ui'

const PROVIDERS = ['Buffer', 'Zernio', 'Cloudinary'] as const

/**
 * Tambah / edit satu koneksi. Secret tidak pernah dikirim balik ke browser:
 * saat edit, field secret kosong dengan placeholder 4 karakter terakhir, dan
 * kosong berarti "pertahankan nilai lama".
 */
export function ConnectionSheet({
  id,
  provider: initialProvider,
  onClose,
}: {
  id?: string
  provider?: ConnectionProvider
  onClose: () => void
}) {
  const { toast } = useApp()
  const existing = findConnection(id)
  const editing = Boolean(existing)
  const [provider, setProvider] = useState<ConnectionProvider>(existing?.provider ?? initialProvider ?? 'Buffer')
  const [label, setLabel] = useState(existing?.label ?? '')
  const [showSecret, setShowSecret] = useState(false)
  const [test, setTest] = useState<'idle' | 'busy' | 'ok'>('idle')
  const masked = existing ? `••••••••${existing.keyHint}` : '••••••••'
  const keepHint = editing ? 'Kosongkan = tetap pakai nilai lama.' : undefined

  return (
    <Sheet
      title={editing ? `Edit koneksi: ${existing!.label}` : 'Tambah koneksi'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary ml-auto"
            disabled={!label.trim()}
            onClick={() => {
              toast(editing ? `Koneksi '${label}' disimpan` : `Koneksi '${label}' ditambahkan`)
              onClose()
            }}
          >
            {editing ? 'Simpan perubahan' : 'Simpan koneksi'}
          </button>
        </>
      }
    >
      <Field label="Layanan">
        {editing ? (
          <span className="mono block py-1">{provider}</span>
        ) : (
          <Seg
            options={PROVIDERS}
            value={provider}
            onChange={(p) => {
              setProvider(p)
              setTest('idle')
            }}
            label="Layanan"
          />
        )}
      </Field>
      <Field label="Nama koneksi" hint="Nama bebas untuk membedakan akun, mis. 'Buffer Utama' atau 'Cloudinary Kuliner'.">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={provider === 'Cloudinary' ? 'Cloudinary Kuliner' : `${provider} Utama`}
        />
      </Field>

      {provider === 'Cloudinary' ? (
        <>
          <Field label="Cloud name">
            <input className="mono" defaultValue={existing?.cloudName} placeholder="ternak-kuliner" />
          </Field>
          <Field label="API key" hint={keepHint}>
            <input className="mono" placeholder={masked} />
          </Field>
          <Field label="API secret" hint={keepHint}>
            <div className="relative">
              <input className="mono !pr-9" type={showSecret ? 'text' : 'password'} placeholder={masked} autoComplete="off" />
              <button
                type="button"
                className="absolute right-2 top-2"
                onClick={() => setShowSecret(!showSecret)}
                aria-label={showSecret ? 'Sembunyikan' : 'Tampilkan'}
              >
                <Icon n="eye" />
              </button>
            </div>
          </Field>
        </>
      ) : (
        <Field label="API key" hint={keepHint ?? `Ambil dari dashboard ${provider} → pengaturan API/akses developer.`}>
          <div className="relative">
            <input className="mono !pr-9" type={showSecret ? 'text' : 'password'} placeholder={masked} autoComplete="off" />
            <button
              type="button"
              className="absolute right-2 top-2"
              onClick={() => setShowSecret(!showSecret)}
              aria-label={showSecret ? 'Sembunyikan' : 'Tampilkan'}
            >
              <Icon n="eye" />
            </button>
          </div>
        </Field>
      )}

      <button
        type="button"
        className="btn btn-outline"
        disabled={test === 'busy'}
        onClick={() => {
          setTest('busy')
          setTimeout(() => setTest('ok'), 700)
        }}
      >
        <Icon n="refresh" s={14} />
        {test === 'busy' ? 'Mengetes…' : provider === 'Cloudinary' ? 'Tes koneksi' : 'Tes & ambil akun tertaut'}
      </button>
      {test === 'ok' && (
        <p className="mono mt-3 flex items-center gap-1.5 text-[12px] text-green">
          <Icon n="check" s={13} />
          {provider === 'Cloudinary'
            ? `Terhubung · ${existing?.usage ? `${String(existing.usage.used).replace('.', ',')}/${existing.usage.limit}` : '0/25'} kredit bulan ini`
            : `Terhubung · ${existing?.profiles.length ?? 4} akun tertaut ditemukan`}
        </p>
      )}

      <p className="mt-6 border-t border-line pt-4 text-[12px] text-muted">
        Secret disimpan terenkripsi di server dan tidak pernah dikirim utuh ke browser. Akun media sosial disambungkan di dalam{' '}
        {provider === 'Cloudinary' ? 'Buffer/Zernio' : provider} — aplikasi ini tidak menyimpan kata sandi media sosial.
      </p>
    </Sheet>
  )
}
