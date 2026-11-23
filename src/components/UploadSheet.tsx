import { useState } from 'react'
import { useApp } from '../app/context'
import { findChannel } from '../lib/store'
import { Poster } from './domain'
import { Icon } from './Icon'
import { Field, Sheet, Switch } from './ui'

/** Contoh file selama unggah ke Cloudinary belum tersambung. */
const SAMPLE_FILES = [
  { name: 'nasi-goreng.mp4', size: '18,2 MB', status: 'Selesai' },
  { name: 'rendang.mp4', size: '41,0 MB', status: 'Mengunggah 64%' },
  { name: 'sambal.mov', size: '12,7 MB', status: 'Gagal · Coba lagi' },
]

export function UploadSheet({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const { demoOnly, mode } = useApp()
  const c = findChannel(channelId)
  const [same, setSame] = useState(true)
  const [front, setFront] = useState(false)
  const template = `{judul} — simpan dulu, coba nanti. #${c?.niche ?? 'konten'}`
  return (
    <Sheet
      title={`Unggah ke ${c?.name ?? 'channel'}`}
      onClose={onClose}
      footer={
        <>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={front} onChange={() => setFront(!front)} />
            Taruh di depan antrean
          </label>
          <button
            type="button"
            className="btn btn-tomato ml-auto"
            onClick={() => {
              demoOnly(`${SAMPLE_FILES.length} video masuk antrean${front ? ' (paling depan)' : ''}`, 'Unggah video')
              onClose()
            }}
          >
            Masukkan ke antrean ({SAMPLE_FILES.length})
          </button>
        </>
      }
    >
      {mode === 'live' && (
        <p className="mb-4 rounded-[4px] border-[1.5px] border-amber p-3 text-[13px] text-amber">
          Unggah ke Cloudinary menyusul di tahap berikutnya. Daftar di bawah masih contoh.
        </p>
      )}
      <label className="mb-5 block cursor-pointer rounded-[6px] border-2 border-dashed border-ink p-8 text-center">
        <input type="file" accept="video/mp4,video/quicktime" multiple className="sr-only" />
        <Icon n="upload" s={24} className="mx-auto mb-2" />
        <span className="block font-semibold">Lepas video di sini</span>
        <span className="mono block text-[12px] text-muted">MP4/MOV, maks 200 MB per file</span>
      </label>
      {SAMPLE_FILES.map((f, i) => (
        <div key={f.name} className="border-b border-line py-2">
          <div className="flex items-center gap-3">
            <Poster hue={i * 2} className="w-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{f.name}</p>
              <p className="mono text-[11px] text-muted">{f.size}</p>
            </div>
            <span className={`mono text-[12px] ${f.status.startsWith('Gagal') ? 'text-red' : ''}`}>{f.status}</span>
          </div>
          {!same && <textarea rows={2} className="mt-2 !text-[12px]" defaultValue={template} aria-label={`Caption ${f.name}`} />}
        </div>
      ))}
      <label className="mb-3 mt-5 flex items-center gap-2">
        <Switch on={same} onChange={setSame} label="Caption sama untuk semua" />
        Caption sama untuk semua
      </label>
      {same && (
        <Field label="Caption" hint="Diisi dari template channel. Variabel {judul} diganti nama file.">
          <textarea rows={3} defaultValue={template} />
        </Field>
      )}
      <Field label="Topik">
        <input placeholder="mis. resep sarapan" />
      </Field>
    </Sheet>
  )
}
