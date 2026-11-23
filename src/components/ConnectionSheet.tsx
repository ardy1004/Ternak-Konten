import { useState } from 'react'
import type { ConnectionDTO, ConnectionTestDTO } from '../../shared/contract'
import { useApp } from '../app/context'
import { api, errorText } from '../lib/api'
import { findConnection } from '../lib/store'
import type { ConnectionProvider } from '../lib/types'
import { Icon } from './Icon'
import { Field, Seg, Sheet } from './ui'

const PROVIDERS = ['Buffer', 'Zernio', 'Cloudinary'] as const

type TestState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; ok: boolean; text: string }

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
  const { toast, mode, reload } = useApp()
  const existing = findConnection(id)
  const editing = Boolean(existing)
  const [provider, setProvider] = useState<ConnectionProvider>(existing?.provider ?? initialProvider ?? 'Buffer')
  const [label, setLabel] = useState(existing?.label ?? '')
  const [cloudName, setCloudName] = useState(existing?.cloudName ?? '')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [test, setTest] = useState<TestState>({ kind: 'idle' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const masked = existing ? `••••••••${existing.keyHint}` : '••••••••'
  const keepHint = editing ? 'Kosongkan = tetap pakai nilai lama.' : undefined
  const isCloud = provider === 'Cloudinary'
  const payload = { provider, label: label.trim(), cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() }

  const runTest = async () => {
    setTest({ kind: 'busy' })
    if (mode === 'demo') {
      setTimeout(
        () =>
          setTest({
            kind: 'done',
            ok: true,
            text: isCloud ? 'Terhubung · 12,4/25 kredit bulan ini' : 'Terhubung · 4 akun tertaut ditemukan',
          }),
        600,
      )
      return
    }
    try {
      const r = await api<ConnectionTestDTO>('connections/test', { method: 'POST', body: { ...payload, id } })
      const text = !r.ok
        ? (r.error ?? 'Gagal')
        : isCloud
          ? `Terhubung${r.usage ? ` · ${String(r.usage.used).replace('.', ',')}/${r.usage.limit} kredit bulan ini` : ''}`
          : `Terhubung · ${r.profiles} akun tertaut ditemukan`
      setTest({ kind: 'done', ok: r.ok, text })
    } catch (e) {
      setTest({ kind: 'done', ok: false, text: errorText(e) })
    }
  }

  const save = async () => {
    if (mode === 'demo') {
      toast(editing ? `Koneksi '${label}' disimpan` : `Koneksi '${label}' ditambahkan`)
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = editing
        ? await api<ConnectionDTO>(`connections/${id}`, { method: 'PATCH', body: payload })
        : await api<ConnectionDTO>('connections', { method: 'POST', body: payload })
      await reload()
      toast(
        saved.status === 'ok'
          ? `Koneksi '${saved.label}' tersimpan dan terhubung`
          : `Koneksi '${saved.label}' tersimpan, tapi tesnya gagal: ${saved.error ?? ''}`,
      )
      onClose()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  const missingRequired = !label.trim() || (!editing && (!apiKey.trim() || (isCloud && (!apiSecret.trim() || !cloudName.trim()))))

  return (
    <Sheet
      title={editing ? `Edit koneksi: ${existing!.label}` : 'Tambah koneksi'}
      onClose={onClose}
      footer={
        <>
          {error && (
            <span className="w-full text-[13px] text-red" role="alert">
              {error}
            </span>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary ml-auto" disabled={missingRequired || saving} onClick={save}>
            {saving ? 'Menyimpan & mengetes…' : editing ? 'Simpan perubahan' : 'Simpan koneksi'}
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
              setTest({ kind: 'idle' })
            }}
            label="Layanan"
          />
        )}
      </Field>
      <Field label="Nama koneksi" hint="Nama bebas untuk membedakan akun, mis. 'Buffer Utama' atau 'Cloudinary Kuliner'.">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={isCloud ? 'Cloudinary Kuliner' : `${provider} Utama`}
          maxLength={80}
        />
      </Field>

      {isCloud && (
        <Field label="Cloud name">
          <input className="mono" value={cloudName} onChange={(e) => setCloudName(e.target.value)} placeholder="ternak-kuliner" />
        </Field>
      )}
      <Field
        label="API key"
        hint={keepHint ?? (isCloud ? undefined : `Ambil dari dashboard ${provider} → pengaturan API/akses developer.`)}
      >
        <div className="relative">
          <input
            className="mono !pr-9"
            type={showSecret ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={masked}
            autoComplete="off"
          />
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
      {isCloud && (
        <Field label="API secret" hint={keepHint}>
          <input
            className="mono"
            type={showSecret ? 'text' : 'password'}
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={masked}
            autoComplete="off"
          />
        </Field>
      )}

      <button type="button" className="btn btn-outline" disabled={test.kind === 'busy' || (!editing && !apiKey.trim())} onClick={runTest}>
        <Icon n="refresh" s={14} />
        {test.kind === 'busy' ? 'Mengetes…' : isCloud ? 'Tes koneksi' : 'Tes & ambil akun tertaut'}
      </button>
      {test.kind === 'done' && (
        <p className={`mono mt-3 flex items-center gap-1.5 text-[12px] ${test.ok ? 'text-green' : 'text-red'}`} role="status">
          <Icon n={test.ok ? 'check' : 'alert'} s={13} />
          {test.text}
        </p>
      )}

      <p className="mt-6 border-t border-line pt-4 text-[12px] text-muted">
        Secret disimpan terenkripsi di server dan tidak pernah dikirim utuh ke browser. Akun media sosial disambungkan di dalam{' '}
        {isCloud ? 'Buffer/Zernio' : provider} — aplikasi ini tidak menyimpan kata sandi media sosial.
      </p>
    </Sheet>
  )
}
