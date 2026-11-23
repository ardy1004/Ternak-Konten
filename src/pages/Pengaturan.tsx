import { useState } from 'react'
import { Link } from 'react-router'
import { useApp } from '../app/context'
import { Field, Label, Seg, Switch } from '../components/ui'
import { num } from '../lib/format'
import { CHANNELS, CONNECTIONS, GLOBAL_STORAGE_ID, MONETIZATION_RULES, PLATFORMS, providerAt, USD_RATE_DEFAULT } from '../lib/mock'
import { TARGET_METRICS } from '../components/ChannelWizard'

const TABS = [
  'Umum',
  'Mode akun',
  'Masa uji default',
  'Biaya & kurs',
  'Syarat monetisasi',
  'Jendela primetime',
  'Otomasi',
  'Storage global',
  'Notifikasi',
  'Log aktivitas',
] as const
type Tab = (typeof TABS)[number]
const EVENTS = ['Gagal', 'Belum pasti', 'Login kedaluwarsa', 'Stok antrean ≤ 2 hari', 'Masa uji selesai', 'Kuota storage > 80%']
const WINDOWS = [
  { name: 'Pagi', from: '06.00', to: '08.00', a: 6, b: 8 },
  { name: 'Siang', from: '11.30', to: '13.00', a: 11.5, b: 13 },
  { name: 'Malam', from: '19.00', to: '21.00', a: 19, b: 21 },
]
const LOG = [
  ['23 Nov 14.02', "Memangkas 'Rumah Idaman' di hari 45", 'Rumah Idaman'],
  ['23 Nov 12.40', 'Menjadwalkan 3 video', 'Dapur Nenek'],
  ['22 Nov 20.11', 'Menyambungkan ulang Buffer', 'Tips Cuan'],
]

export default function Pengaturan() {
  const { auto, requestAuto, dark, setDark, toast } = useApp()
  const [tab, setTab] = useState<Tab>('Umum')
  const [mode, setMode] = useState<'Terpusat' | 'Per channel'>('Per channel')
  const [notify, setNotify] = useState<Record<string, boolean>>({})
  const [prices, setPrices] = useState({ buffer: 60000, zernio: 45000, cloudinary: 350000 })
  const [rate, setRate] = useState(USD_RATE_DEFAULT)
  const [rules, setRules] = useState(MONETIZATION_RULES)
  const [globalStorage, setGlobalStorage] = useState(GLOBAL_STORAGE_ID)
  // Biaya per akun media sosial yang aktif, dikelompokkan per provider koneksinya.
  const connected = CHANNELS.flatMap((c) => c.accounts.map((a, i) => (a !== 'off' ? providerAt(c, i) : null)))
  const total =
    connected.filter((p) => p === 'Buffer').length * prices.buffer +
    connected.filter((p) => p === 'Zernio').length * prices.zernio +
    prices.cloudinary

  return (
    <div className="p-5 md:p-8">
      <h1 className="disp mb-8 text-[40px] md:text-[56px]">Pengaturan</h1>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto border-ink md:flex-col md:border-r-[1.5px] md:pr-4" aria-label="Bagian pengaturan">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={tab === t ? 'page' : undefined}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-[4px] px-2 py-1.5 text-left ${tab === t ? 'bg-ink text-paper' : 'hover:bg-sand'}`}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="max-w-2xl">
          <Label>{tab}</Label>

          {tab === 'Umum' && (
            <>
              <Field label="Nama workspace">
                <input defaultValue="Ternak Konten" />
              </Field>
              <Field label="Zona waktu">
                <select>
                  <option>Asia/Jakarta (WIB)</option>
                </select>
              </Field>
              <Field label="Bahasa">
                <select>
                  <option>Bahasa Indonesia</option>
                </select>
              </Field>
              <label className="flex items-center gap-3">
                <Switch on={dark} onChange={setDark} label="Mode malam" />
                Mode malam
              </label>
            </>
          )}

          {tab === 'Mode akun' && (
            <>
              <div className="mb-4">
                <Seg options={['Terpusat', 'Per channel'] as const} value={mode} onChange={setMode} label="Mode akun" />
              </div>
              {mode === 'Terpusat' ? (
                <Field label="Channel utama" hint="Semua channel memakai scheduler & storage milik channel ini.">
                  <select>
                    {CHANNELS.filter((c) => c.stage !== 'Dipangkas').map((c) => (
                      <option key={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <p className="text-ink2">Setiap channel memakai scheduler dan storage sendiri.</p>
              )}
            </>
          )}

          {tab === 'Masa uji default' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hari">
                <input className="mono" type="number" defaultValue={30} />
              </Field>
              <Field label="Video">
                <input className="mono" type="number" defaultValue={30} />
              </Field>
              <Field label="Metrik">
                <select>
                  {TARGET_METRICS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nilai target">
                <input className="mono" type="number" defaultValue={1000} />
              </Field>
            </div>
          )}

          {tab === 'Biaya & kurs' && (
            <>
              {(
                [
                  ['buffer', 'Buffer per channel (Rp/bln)'],
                  ['zernio', 'Zernio per channel (Rp/bln)'],
                  ['cloudinary', 'Cloudinary (Rp/bln)'],
                ] as const
              ).map(([k, l]) => (
                <Field key={k} label={l}>
                  <input
                    className="mono"
                    type="number"
                    value={prices[k]}
                    onChange={(e) => setPrices({ ...prices, [k]: +e.target.value })}
                  />
                </Field>
              ))}
              <p className="mono text-[22px] font-semibold">Total Rp {num(total)}/bln</p>
              <p className="mt-1 text-[12px] text-muted">
                Dihitung dari jumlah akun media sosial aktif per provider. Dipakai untuk biaya & ROI per niche.
              </p>
              <div className="mt-6 border-t border-line pt-4">
                <Field
                  label="Kurs USD → Rp"
                  hint="Untuk mencatat pendapatan YouTube/AdSense yang dibayar dalam USD. Isi sesuai kurs yang kamu pakai."
                >
                  <input className="mono !w-40" type="number" value={rate} onChange={(e) => setRate(+e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {tab === 'Jendela primetime' && (
            <>
              {WINDOWS.map((w) => (
                <div key={w.name} className="mb-3 grid grid-cols-[80px_1fr_1fr] items-center gap-3">
                  <b>{w.name}</b>
                  <input className="mono" defaultValue={w.from} aria-label={`${w.name} mulai`} />
                  <input className="mono" defaultValue={w.to} aria-label={`${w.name} selesai`} />
                </div>
              ))}
              <div className="relative mt-4 h-5 bg-line" aria-hidden="true">
                {WINDOWS.map((w) => (
                  <span
                    key={w.name}
                    className="absolute inset-y-0 bg-ink"
                    style={{ left: `${(w.a / 24) * 100}%`, width: `${((w.b - w.a) / 24) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mono flex justify-between text-[10px] text-muted">
                <span>00</span>
                <span>12</span>
                <span>24</span>
              </div>
            </>
          )}

          {tab === 'Otomasi' && (
            <>
              <label className="mb-3 flex items-center gap-3">
                <Switch on={auto} onChange={requestAuto} label="Auto-posting" />
                Auto-posting <span className="mono">{auto ? 'AKTIF' : 'MATI'}</span>
              </label>
              <p className="mb-4 text-ink2">
                Antrean diproses sekali sehari: semua post 24 jam ke depan dikirim ke Buffer/Zernio dengan jamnya masing-masing.
              </p>
              <Field label="Batas kirim ulang otomatis">
                <input className="mono !w-24" type="number" defaultValue={2} />
              </Field>
              <Field label="Hapus isi Sampah setelah (hari)">
                <input className="mono !w-24" type="number" defaultValue={30} />
              </Field>
            </>
          )}

          {tab === 'Storage global' && (
            <>
              <p className="mb-4 text-ink2">Channel yang tidak memilih akun Cloudinary sendiri menyimpan videonya di sini.</p>
              <Field label="Koneksi Cloudinary global">
                <select value={globalStorage} onChange={(e) => setGlobalStorage(e.target.value)}>
                  {CONNECTIONS.filter((k) => k.provider === 'Cloudinary').map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label} ({k.cloudName})
                    </option>
                  ))}
                </select>
              </Field>
              <Link to="/koneksi" className="text-[13px] underline">
                Kelola akun Cloudinary di halaman Koneksi →
              </Link>
            </>
          )}

          {tab === 'Syarat monetisasi' && (
            <>
              <p className="mb-5 rounded-[4px] border-[1.5px] border-amber p-3 text-[13px] text-amber">
                Syarat resmi tiap program berubah dari waktu ke waktu dan bisa berbeda per negara. Angka bawaan ini hanya titik awal —
                periksa halaman resmi platformnya, lalu sesuaikan di sini.
              </p>
              {rules.map((rule, ri) => (
                <div key={rule.program} className="mb-6">
                  <h3 className="mb-2 font-semibold">
                    {rule.program} <span className="mono text-[11px] font-normal text-muted">{PLATFORMS[rule.platform]}</span>
                  </h3>
                  {(['all', 'anyOf'] as const).map((group) =>
                    rule[group].length === 0 ? null : (
                      <div key={group} className="mb-2">
                        <span className="mono mb-1 block text-[10px] uppercase tracking-wider text-muted">
                          {group === 'all' ? 'Wajib semua' : 'Cukup salah satu'}
                        </span>
                        {rule[group].map((q, qi) => (
                          <div key={q.label} className="mb-2 grid grid-cols-[1fr_140px] items-center gap-3">
                            <span className="text-[13px]">{q.label}</span>
                            <input
                              className="mono"
                              type="number"
                              min={0}
                              aria-label={`${rule.program}: ${q.label}`}
                              value={q.target}
                              onChange={(e) =>
                                setRules(
                                  rules.map((r, k) =>
                                    k !== ri
                                      ? r
                                      : { ...r, [group]: r[group].map((x, j) => (j === qi ? { ...x, target: +e.target.value } : x)) },
                                  ),
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ),
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'Notifikasi' && (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th py-1">Event</th>
                  <th className="th">Email</th>
                  <th className="th">Telegram</th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e} className="border-t border-line">
                    <td className="py-2">{e}</td>
                    {(['Email', 'Telegram'] as const).map((k) => (
                      <td key={k}>
                        <Switch
                          on={notify[e + k] ?? k === 'Email'}
                          onChange={(b) => setNotify({ ...notify, [e + k]: b })}
                          label={`${e} lewat ${k}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'Log aktivitas' &&
            LOG.map(([t, what, ch]) => (
              <div key={t} className="grid grid-cols-[110px_1fr_auto] gap-3 border-b border-line py-2.5 text-[13px]">
                <span className="mono">{t}</span>
                <span>{what}</span>
                <span className="text-muted">{ch}</span>
              </div>
            ))}

          {tab !== 'Log aktivitas' && (
            <button type="button" className="btn btn-primary mt-6" onClick={() => toast('Pengaturan disimpan')}>
              Simpan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
