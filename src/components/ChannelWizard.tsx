import { Fragment, useState } from 'react'
import { useApp } from '../app/context'
import { num } from '../lib/format'
import { PLATFORMS } from '../lib/mock'
import type { Provider } from '../lib/types'
import { Monogram, PlatGlyph } from './domain'
import { Icon } from './Icon'
import { Chips, Field, Label, MultiChips, Seg, Sheet, Switch } from './ui'

const STEPS = ['Identitas', 'Eksperimen', 'Storage', 'Scheduler', 'Jadwal'] as const
const NICHES = ['kuliner', 'otomotif', 'keuangan', 'horor', 'travel', 'edukasi', 'properti'] as const
const FORMATS = ['Faceless', 'Voice-over', 'Talking head', 'Slideshow', 'Lainnya'] as const
const METRICS = ['Median views/post', 'Followers', 'Engagement'] as const
const DAYS = ['Sen 23', 'Sel 24', 'Rab 25', 'Kam 26', 'Jum 27', 'Sab 28', 'Min 29']

/** Akun tertaut contoh — nantinya diambil dari API Buffer/Zernio. */
const LINKED = [
  { platform: 0, name: 'Dapur Nenek', id: 'yt_8821' },
  { platform: 1, name: '@dapurnenek', id: 'tt_4410' },
  { platform: 2, name: 'dapur.nenek', id: 'ig_1902' },
]

export function ChannelWizard({ onClose }: { onClose: () => void }) {
  const { toast } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [niche, setNiche] = useState<(typeof NICHES)[number]>('kuliner')
  const [tags, setTags] = useState<string[]>(['#kuliner', '#resep'])
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('Faceless')
  const [days, setDays] = useState(30)
  const [vids, setVids] = useState(30)
  const [metric, setMetric] = useState<(typeof METRICS)[number]>('Median views/post')
  const [target, setTarget] = useState(1000)
  const [storage, setStorage] = useState<'global' | 'own'>('global')
  const [storageTest, setStorageTest] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [linked, setLinked] = useState<Record<Provider, boolean>>({ Buffer: false, Zernio: false })
  const [route, setRoute] = useState(
    PLATFORMS.map((_, i) => ({ on: i < 3, provider: (i === 2 || i === 4 ? 'Zernio' : 'Buffer') as Provider, account: '' })),
  )
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [slots, setSlots] = useState(['07.00', '12.15', '19.30'])
  const [newSlot, setNewSlot] = useState('21.00')

  const finish = (start: boolean) => {
    toast(start ? `${name || 'Channel baru'} dibuat, masa uji dimulai` : 'Channel disimpan, belum aktif')
    onClose()
  }
  const setRow = (i: number, patch: Partial<(typeof route)[number]>) => setRoute(route.map((r, k) => (k === i ? { ...r, ...patch } : r)))

  return (
    <Sheet
      title="Tambah Channel"
      width={680}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Kembali
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
              Lanjut
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-tomato" onClick={() => finish(true)}>
                Simpan & mulai masa uji
              </button>
              <button type="button" className="btn btn-outline" onClick={() => finish(false)}>
                Simpan, jangan aktifkan dulu
              </button>
            </>
          )}
          <button
            type="button"
            className="ml-auto text-[13px] underline"
            onClick={() => {
              toast('Draft disimpan')
              onClose()
            }}
          >
            Simpan sebagai draft
          </button>
        </>
      }
    >
      <ol className="mb-8 flex border-b border-line">
        {STEPS.map((t, i) => (
          <li key={t} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? 'step' : undefined}
              className={`-mb-px w-full border-b-[3px] pb-2 text-left ${i === step ? 'border-tomato' : 'border-transparent'}`}
            >
              <span className="mono text-[11px] text-muted">0{i + 1}</span>
              <span className={`block text-[13px] ${i === step ? 'font-semibold' : 'text-muted'}`}>{t}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <Field label="Nama channel">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dapur Nenek" />
          </Field>
          <div className="mb-4 flex items-center gap-3">
            <Monogram name={name || 'Channel Baru'} s={48} ink />
            <button type="button" className="btn btn-outline">
              Unggah avatar
            </button>
          </div>
          <Field label="Niche">
            <Chips options={NICHES} value={niche} onChange={setNiche} />
          </Field>
          <Field label="Email akun">
            <input type="email" placeholder="akun@gmail.com" />
          </Field>
          <Field label="Template caption" hint="Variabel: {judul} {hashtag_niche}">
            <textarea rows={3} defaultValue="{judul} — simpan dulu, coba nanti. {hashtag_niche}" className="mono !text-[12px]" />
          </Field>
          <Field label="Hashtag niche">
            <MultiChips options={['#kuliner', '#resep', '#fyp', '#masakrumahan']} value={tags} onChange={setTags} />
          </Field>
        </>
      )}

      {step === 1 && (
        <>
          <Field label="Hipotesis" hint="Satu kalimat: apa yang sedang diuji.">
            <input placeholder="Resep 30 detik tanpa bicara, close-up tangan" />
          </Field>
          <Field label="Format">
            <Chips options={FORMATS} value={format} onChange={setFormat} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Masa uji (hari)">
              <input className="mono" type="number" min={1} value={days} onChange={(e) => setDays(+e.target.value)} />
            </Field>
            <Field label="Masa uji (video)">
              <input className="mono" type="number" min={1} value={vids} onChange={(e) => setVids(+e.target.value)} />
            </Field>
          </div>
          <p className="-mt-2 mb-4 text-[12px] text-muted">Masa uji selesai bila KEDUA batas tercapai.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Metrik">
              <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
                {METRICS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Nilai">
              <input className="mono" type="number" min={0} value={target} onChange={(e) => setTarget(+e.target.value)} />
            </Field>
          </div>
          <p className="box mb-4 p-3 text-[13px]">
            Lulus bila <b>{metric.toLowerCase()}</b> ≥ <span className="mono">{num(target)}</span> di akhir masa uji.
          </p>
          <Field label="Biaya per bulan (Rp, opsional)" hint="Terisi otomatis dari harga alat di Pengaturan.">
            <input className="mono" defaultValue="180.000" />
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <fieldset className="mb-5 space-y-2">
            <legend className="sr-only">Sumber storage</legend>
            {(
              [
                ['global', 'Pakai storage global'],
                ['own', 'Akun Cloudinary sendiri'],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="storage" checked={storage === v} onChange={() => setStorage(v)} />
                {l}
              </label>
            ))}
          </fieldset>
          {storage === 'own' && (
            <>
              <Field label="Cloud name">
                <input className="mono" placeholder="ternak-dapur" />
              </Field>
              <Field label="API key">
                <input className="mono" placeholder="123456789012345" />
              </Field>
              <Field label="API secret" hint="Saat mengedit channel: kosongkan = tetap pakai nilai lama.">
                <div className="relative">
                  <input className="mono !pr-9" type={showSecret ? 'text' : 'password'} placeholder="••••••••" />
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
              <Field label="Folder">
                <input className="mono" defaultValue="ternak/dapur-nenek" />
              </Field>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStorageTest('Terhubung · 4,2 GB · 12,4/25 kredit bulan ini')}
              >
                Tes koneksi
              </button>
              {storageTest && <p className="mono mt-3 text-[12px] text-green">{storageTest}</p>}
            </>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {(['Buffer', 'Zernio'] as const).map((p) => (
              <div key={p} className="box p-4">
                <h4 className="mb-3 font-semibold">{p}</h4>
                <Field label="API key">
                  <input type="password" className="mono" placeholder="••••••••" />
                </Field>
                <button type="button" className="btn btn-outline" onClick={() => setLinked({ ...linked, [p]: true })}>
                  Tes & ambil akun tertaut
                </button>
                {linked[p] && (
                  <ul className="mt-3 space-y-1 text-[12px]">
                    {LINKED.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <PlatGlyph i={a.platform} />
                        {a.name}
                        <span className="mono ml-auto text-muted">{a.id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <Label>Rute platform</Label>
          <div className="scroll-x">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr>
                  <th className="th py-1">Aktif</th>
                  <th className="th">Platform</th>
                  <th className="th">Provider</th>
                  <th className="th">Akun tujuan</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p, i) => {
                  const r = route[i]
                  const connected = linked[r.provider]
                  const status = !r.on ? null : !connected ? 'Provider belum tersambung' : r.account ? 'Siap' : 'Belum dipilih'
                  return (
                    <Fragment key={p}>
                      <tr className="border-t border-line">
                        <td className="py-2">
                          <Switch on={r.on} onChange={(on) => setRow(i, { on })} label={`Aktifkan ${p}`} />
                        </td>
                        <td>{p}</td>
                        <td>
                          <Seg
                            options={['Buffer', 'Zernio'] as const}
                            value={r.provider}
                            onChange={(provider) => setRow(i, { provider, account: '' })}
                            label={`Provider ${p}`}
                          />
                        </td>
                        <td>
                          <select
                            className="!py-1"
                            disabled={!r.on || !connected}
                            value={r.account}
                            onChange={(e) => setRow(i, { account: e.target.value })}
                            aria-label={`Akun tujuan ${p}`}
                          >
                            <option value="">Pilih akun…</option>
                            {LINKED.filter((a) => a.platform === i).map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.id})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={`text-[12px] ${status === 'Siap' ? 'text-green' : status ? 'text-muted' : ''}`}>{status ?? '—'}</td>
                      </tr>
                      {r.account === 'ig_1902' && (
                        <tr>
                          <td colSpan={5} className="pb-2 text-[12px] text-amber">
                            <span className="flex items-center gap-1">
                              <Icon n="alert" s={12} />
                              Akun ini juga dipakai channel &apos;Dapur Nenek&apos;. Dua channel akan posting ke akun yang sama.
                            </span>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <fieldset className="mb-5 space-y-3">
            <legend className="sr-only">Mode jadwal</legend>
            <label className="flex gap-2">
              <input type="radio" name="mode" checked={mode === 'auto'} onChange={() => setMode('auto')} />
              <span>
                <b>Otomatis bertahap</b>
                <span className="block text-[12px] text-muted">
                  1 → 2 → 3 video/hari mengikuti umur akun, jam diacak di jendela primetime
                </span>
              </span>
            </label>
            <label className="flex gap-2">
              <input type="radio" name="mode" checked={mode === 'manual'} onChange={() => setMode('manual')} />
              <span>
                <b>Manual</b>
                <span className="block text-[12px] text-muted">Atur sendiri jam posting, maks 10/hari</span>
              </span>
            </label>
          </fieldset>
          {mode === 'manual' && (
            <div className="mb-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="chip mono"
                    onClick={() => setSlots(slots.filter((x) => x !== t))}
                    aria-label={`Hapus jam ${t}`}
                  >
                    {t} <Icon n="x" s={10} />
                  </button>
                ))}
                <input className="mono !w-20 !py-1" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} aria-label="Jam baru" />
                <button
                  type="button"
                  className="chip"
                  disabled={slots.length >= 10 || !/^\d{2}\.\d{2}$/.test(newSlot) || slots.includes(newSlot)}
                  onClick={() => setSlots([...slots, newSlot].sort())}
                >
                  + Tambah jam
                </button>
              </div>
              <Field label="Jeda antar platform (menit)">
                <input className="mono !w-24" type="number" defaultValue={7} />
              </Field>
            </div>
          )}
          <Label>7 hari ke depan</Label>
          <table className="mono mb-5 w-full text-[12px]">
            <tbody>
              {DAYS.map((d, i) => (
                <tr key={d} className="border-b border-line">
                  <td className="py-1">{d}</td>
                  <td>{(mode === 'auto' ? ['07.12', '12.40', '19.33'].slice(0, Math.min(3, 1 + (i >> 1))) : slots).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="box p-3 text-[13px]">
            Ringkasan: <b>{name || 'Channel baru'}</b> · {niche} · {format} · uji {days} hari / {vids} video · target {metric.toLowerCase()}{' '}
            ≥ {num(target)}
          </div>
        </>
      )}
    </Sheet>
  )
}
