import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/context'
import { num } from '../lib/format'
import { CONNECTIONS, findChannel, findConnection, GLOBAL_STORAGE_ID, ownerOfProfile, PLATFORMS } from '../lib/mock'
import { Monogram, PlatGlyph } from './domain'
import { Icon } from './Icon'
import { Chips, Field, Label, MultiChips, Sheet, Switch } from './ui'

const STEPS = ['Identitas', 'Eksperimen', 'Storage', 'Scheduler', 'Jadwal'] as const
const NICHES = ['kuliner', 'otomotif', 'keuangan', 'horor', 'travel', 'edukasi', 'properti'] as const
const FORMATS = ['Faceless', 'Voice-over', 'Talking head', 'Slideshow', 'Lainnya'] as const
export const TARGET_METRICS = ['Median views/post', 'Followers', 'Engagement', 'ROI (pendapatan ÷ biaya)', 'Pendapatan per bulan'] as const
const DAYS = ['Sen 23', 'Sel 24', 'Rab 25', 'Kam 26', 'Jum 27', 'Sab 28', 'Min 29']

type Niche = (typeof NICHES)[number]
type Format = (typeof FORMATS)[number]
type Metric = (typeof TARGET_METRICS)[number]
interface RouteDraft {
  on: boolean
  connectionId: string
  profileId: string
}

const schedulerConnections = CONNECTIONS.filter((k) => k.provider !== 'Cloudinary')
const storageConnections = CONNECTIONS.filter((k) => k.provider === 'Cloudinary')

/** Tambah channel (tanpa channelId) atau edit channel yang ada. Kredensial dipilih dari Koneksi, tidak diketik ulang. */
export function ChannelWizard({ channelId, onClose }: { channelId?: string; onClose: () => void }) {
  const { toast } = useApp()
  const existing = findChannel(channelId)
  const editing = Boolean(existing)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(existing?.name ?? '')
  const [niche, setNiche] = useState<Niche>((existing?.niche as Niche) ?? 'kuliner')
  const [tags, setTags] = useState<string[]>([`#${existing?.niche ?? 'kuliner'}`, '#fyp'])
  const [format, setFormat] = useState<Format>((existing?.format as Format) ?? 'Faceless')
  const [days, setDays] = useState(existing?.dayTotal ?? 30)
  const [vids, setVids] = useState(existing?.vidsTotal ?? 30)
  const [metric, setMetric] = useState<Metric>('Median views/post')
  const [target, setTarget] = useState(existing?.target ?? 1000)
  const [storageId, setStorageId] = useState(existing?.storageId ?? GLOBAL_STORAGE_ID)
  const [routes, setRoutes] = useState<RouteDraft[]>(() =>
    PLATFORMS.map((_, p) => {
      const r = existing?.routes[p]
      if (r) return { on: true, connectionId: r.connectionId, profileId: r.profileId }
      return { on: !existing && p < 3, connectionId: schedulerConnections[0].id, profileId: '' }
    }),
  )
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [slots, setSlots] = useState(['07.00', '12.15', '19.30'])
  const [newSlot, setNewSlot] = useState('21.00')

  const setRoute = (p: number, patch: Partial<RouteDraft>) => setRoutes(routes.map((r, k) => (k === p ? { ...r, ...patch } : r)))
  const finish = (message: string) => {
    toast(message)
    onClose()
  }

  return (
    <Sheet
      title={editing ? `Pengaturan: ${existing!.name}` : 'Tambah Channel'}
      width={720}
      onClose={onClose}
      footer={
        editing ? (
          <>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Batal
            </button>
            <button type="button" className="btn btn-primary ml-auto" onClick={() => finish(`Pengaturan ${name} disimpan`)}>
              Simpan perubahan
            </button>
          </>
        ) : (
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
                <button
                  type="button"
                  className="btn btn-tomato"
                  onClick={() => finish(`${name || 'Channel baru'} dibuat, masa uji dimulai`)}
                >
                  Simpan & mulai masa uji
                </button>
                <button type="button" className="btn btn-outline" onClick={() => finish('Channel disimpan, belum aktif')}>
                  Simpan, jangan aktifkan dulu
                </button>
              </>
            )}
            <button type="button" className="ml-auto text-[13px] underline" onClick={() => finish('Draft disimpan')}>
              Simpan sebagai draft
            </button>
          </>
        )
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
          <Field label="Email akun" hint="Hanya catatan email pemilik akun. Kata sandi media sosial tidak disimpan di sini.">
            <input type="email" placeholder="akun@gmail.com" />
          </Field>
          <Field label="Template caption" hint="Variabel: {judul} {hashtag_niche} {link_bio}">
            <textarea
              rows={3}
              defaultValue="{judul} — simpan dulu, coba nanti. Produk di {link_bio} {hashtag_niche}"
              className="mono !text-[12px]"
            />
          </Field>
          <Field label="Hashtag niche">
            <MultiChips options={[`#${niche}`, '#fyp', '#viral', `#${niche}harian`]} value={tags} onChange={setTags} />
          </Field>
        </>
      )}

      {step === 1 && (
        <>
          <Field label="Hipotesis" hint="Satu kalimat: apa yang sedang diuji.">
            <input defaultValue={existing?.hypothesis} placeholder="Resep 30 detik tanpa bicara, close-up tangan" />
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
              <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                {TARGET_METRICS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Nilai">
              <input className="mono" type="number" min={0} step="any" value={target} onChange={(e) => setTarget(+e.target.value)} />
            </Field>
          </div>
          <p className="box mb-4 p-3 text-[13px]">
            Lulus bila <b>{metric.toLowerCase()}</b> ≥ <span className="mono">{num(target)}</span> di akhir masa uji.
          </p>
          <Field label="Biaya per bulan (Rp)" hint="Dipakai untuk ROI. Terisi otomatis dari harga alat di Pengaturan, boleh diubah.">
            <input className="mono" defaultValue={num(existing?.costPerMonth ?? 150000)} />
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <Label
            right={
              <Link to="/koneksi" onClick={onClose} className="text-[12px] underline">
                Kelola koneksi →
              </Link>
            }
          >
            Simpan video di
          </Label>
          <fieldset className="space-y-2">
            <legend className="sr-only">Koneksi Cloudinary</legend>
            {storageConnections.map((k) => {
              const pct = k.usage ? k.usage.used / k.usage.limit : 0
              return (
                <label
                  key={k.id}
                  className={`box flex cursor-pointer items-center gap-3 p-3 ${storageId === k.id ? '!border-[2.5px] !border-tomato' : ''}`}
                >
                  <input type="radio" name="storage" checked={storageId === k.id} onChange={() => setStorageId(k.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {k.label} {k.id === GLOBAL_STORAGE_ID && <span className="chip ml-1 !py-0 !text-[10px]">Global</span>}
                    </span>
                    <span className="mono block text-[11px] text-muted">{k.cloudName}</span>
                  </span>
                  <span className={`mono text-[12px] ${pct >= 0.8 ? 'font-semibold text-red' : 'text-muted'}`}>
                    {Math.round(pct * 100)}% kuota
                  </span>
                </label>
              )
            })}
          </fieldset>
          <p className="mt-3 text-[12px] text-muted">Belum ada akun Cloudinary yang cocok? Tambahkan dulu di halaman Koneksi.</p>
        </>
      )}

      {step === 3 && (
        <>
          <Label
            right={
              <Link to="/koneksi" onClick={onClose} className="text-[12px] underline">
                Kelola koneksi →
              </Link>
            }
          >
            Rute platform
          </Label>
          <div className="scroll-x">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead>
                <tr>
                  <th className="th py-1">Aktif</th>
                  <th className="th">Platform</th>
                  <th className="th">Koneksi</th>
                  <th className="th">Akun</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p, i) => {
                  const r = routes[i]
                  const conn = findConnection(r.connectionId)
                  const options = conn?.profiles.filter((x) => x.platform === i) ?? []
                  const chosen = options.find((x) => x.id === r.profileId)
                  const owner = chosen && ownerOfProfile(i, chosen.handle, existing?.id)
                  const status = !r.on ? null : conn?.status === 'error' ? 'Koneksi bermasalah' : chosen ? 'Siap' : 'Belum dipilih'
                  return (
                    <Fragment key={p}>
                      <tr className="border-t border-line">
                        <td className="py-2">
                          <Switch on={r.on} onChange={(on) => setRoute(i, { on })} label={`Aktifkan ${p}`} />
                        </td>
                        <td>
                          <span className="flex items-center gap-1.5">
                            <PlatGlyph i={i} state={r.on ? 'ok' : 'off'} />
                            {p}
                          </span>
                        </td>
                        <td>
                          <select
                            className="!py-1"
                            disabled={!r.on}
                            value={r.connectionId}
                            onChange={(e) => setRoute(i, { connectionId: e.target.value, profileId: '' })}
                            aria-label={`Koneksi ${p}`}
                          >
                            {schedulerConnections.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.provider} · {k.label}
                                {k.status === 'error' ? ' (bermasalah)' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="!py-1"
                            disabled={!r.on}
                            value={r.profileId}
                            onChange={(e) => setRoute(i, { profileId: e.target.value })}
                            aria-label={`Akun ${p}`}
                          >
                            <option value="">{options.length ? 'Pilih akun…' : 'Tidak ada akun tertaut'}</option>
                            {options.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.handle}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td
                          className={`whitespace-nowrap text-[12px] ${status === 'Siap' ? 'text-green' : status === 'Koneksi bermasalah' ? 'text-red' : 'text-muted'}`}
                        >
                          {status ?? '—'}
                        </td>
                      </tr>
                      {r.on && owner && (
                        <tr>
                          <td colSpan={5} className="pb-2 text-[12px] text-amber">
                            <span className="flex items-center gap-1">
                              <Icon n="alert" s={12} />
                              Akun {chosen!.handle} juga dipakai channel &apos;{owner.name}&apos;. Dua channel akan posting ke akun yang
                              sama.
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
          <p className="mt-4 text-[12px] text-muted">
            Akun yang dicari tidak ada? Sambungkan akunnya di dashboard Buffer/Zernio, lalu tekan &ldquo;Tes ulang&rdquo; pada koneksinya di
            halaman Koneksi.
          </p>
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
