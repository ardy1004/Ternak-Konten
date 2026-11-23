import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useApp } from '../app/context'
import { Poster } from '../components/domain'
import { LiveNotice } from '../components/LiveNotice'
import { Icon } from '../components/Icon'
import { Label } from '../components/ui'
import { duration } from '../lib/format'
import { CHANNELS, liveChannels, schedulerReady, videosFor } from '../lib/store'
import type { Ratio } from '../lib/types'

interface UploadRow {
  id: string
  file: string
  duration: number
  ratio: Ratio
  caption: string
  channelId: string
  progress: number
  hue: number
  reusedIn?: string
}

/** Peringatan otomatis per file — aturan sama yang nanti dipakai backend sebelum menjadwalkan. */
function warnings(r: UploadRow): string[] {
  const out: string[] = []
  if (r.reusedIn) out.push(`Sudah pernah dipakai di '${r.reusedIn}'`)
  if (r.duration < 3) out.push(`Durasi ${r.duration} dtk — TikTok minimal 3 dtk`)
  if (r.ratio !== '9:16') out.push(`Rasio ${r.ratio} — Reels & Shorts butuh 9:16`)
  if (r.caption.length > 500) out.push(`Caption ${r.caption.length} karakter — Threads maks 500`)
  return out
}

function sampleRows(): UploadRow[] {
  const targets = liveChannels().filter(schedulerReady)
  const base = videosFor(CHANNELS[0], 'antre').slice(0, 12)
  return base.map((v, i) => ({
    id: v.id,
    file: `klip-${String(i + 1).padStart(2, '0')}.mp4`,
    duration: i === 3 ? 2 : v.duration,
    ratio: v.ratio,
    caption: i === 7 ? v.caption.repeat(6) : v.caption,
    channelId: targets[i % targets.length].id,
    progress: i % 5 === 4 ? 70 : 100,
    hue: v.hue,
    reusedIn: i === 1 ? 'Resep Kilat' : undefined,
  }))
}

export default function Massal() {
  const { toast, demoOnly, mode } = useApp()
  const navigate = useNavigate()
  const [rows, setRows] = useState<UploadRow[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const targets = liveChannels()
  const uploading = rows.some((r) => r.progress < 100)
  // Simulasi unggahan yang masih berjalan sampai unggah sungguhan tersambung.
  useEffect(() => {
    if (!uploading) return
    const t = setTimeout(() => setRows((rs) => rs.map((r) => ({ ...r, progress: 100 }))), 2500)
    return () => clearTimeout(t)
  }, [uploading])
  const assign = (ids: string[], channelId: string) => setRows(rows.map((r) => (ids.includes(r.id) ? { ...r, channelId } : r)))
  const perChannel = targets.map((c) => ({ c, n: rows.filter((r) => r.channelId === c.id).length })).filter((x) => x.n > 0)

  return (
    <div className="p-5 md:p-8">
      <h1 className="disp mb-6 text-[40px] md:text-[56px]">Unggah Massal</h1>
      <LiveNotice>Unggah ke Cloudinary tersambung di tahap 2b.</LiveNotice>
      <label className="mb-10 block w-full cursor-pointer rounded-[6px] border-2 border-dashed border-ink bg-surface/50 py-10 text-center hover:bg-sand/40">
        <input
          type="file"
          multiple
          accept="video/mp4,video/quicktime"
          className="sr-only"
          onClick={(e) => {
            // Selama unggah sungguhan belum tersambung, klik memuat file contoh.
            e.preventDefault()
            // Mode sungguhan: belum ada unggah ke Cloudinary — jangan memuat baris contoh.
            if (mode === 'live') return demoOnly('', 'Unggah massal')
            setRows(sampleRows())
          }}
        />
        <span className="disp block text-[32px]">Lepas video di sini</span>
        <span className="mono text-[12px] text-muted">atau klik untuk memilih puluhan file · MP4/MOV, maks 200 MB</span>
      </label>

      {rows.length === 0 ? (
        <p className="text-muted">Belum ada file. Lepas video untuk mulai membagi ke channel.</p>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 min-w-0 xl:col-span-9">
            <Label>Buku distribusi</Label>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                className="!w-56"
                disabled={selected.length === 0}
                value=""
                aria-label="Kirim terpilih ke channel"
                onChange={(e) => {
                  assign(selected, e.target.value)
                  toast(`${selected.length} video diarahkan ke ${CHANNELS.find((c) => c.id === e.target.value)?.name}`)
                }}
              >
                <option value="">Kirim ke channel…</option>
                {targets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline"
                disabled={selected.length === 0}
                onClick={() => demoOnly(`Template diterapkan ke ${selected.length} video`, 'Template caption')}
              >
                Terapkan template caption
              </button>
              {selected.length > 0 && <span className="mono text-[12px] text-muted">{selected.length} dipilih</span>}
            </div>
            <div className="scroll-x">
              <table className="w-full min-w-[980px] text-[13px]">
                <thead>
                  <tr className="border-b-[1.5px] border-ink">
                    <th className="th w-8 py-2">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua"
                        checked={selected.length === rows.length}
                        onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                      />
                    </th>
                    {['Video', 'Durasi', 'Channel tujuan', 'Caption', 'Unggah', 'Catatan'].map((h) => (
                      <th key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const w = warnings(r)
                    return (
                      <tr key={r.id} className="border-b border-line align-top">
                        <td className="py-2">
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${r.file}`}
                            checked={selected.includes(r.id)}
                            onChange={() => setSelected(selected.includes(r.id) ? selected.filter((x) => x !== r.id) : [...selected, r.id])}
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <Poster hue={r.hue} ratio={r.ratio} className="w-8" />
                            <span className="mono text-[12px]">{r.file}</span>
                          </div>
                        </td>
                        <td className="mono py-2">
                          {duration(r.duration)}
                          <br />
                          {r.ratio}
                        </td>
                        <td className="py-2">
                          <select
                            className="!w-40 !py-1"
                            value={r.channelId}
                            onChange={(e) => assign([r.id], e.target.value)}
                            aria-label={`Channel tujuan ${r.file}`}
                          >
                            {targets.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <textarea
                            rows={2}
                            className="!w-64 !text-[12px]"
                            value={r.caption}
                            aria-label={`Caption ${r.file}`}
                            onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, caption: e.target.value } : x)))}
                          />
                        </td>
                        <td className="mono py-2 text-[12px]">{r.progress === 100 ? 'Selesai' : `${r.progress}%`}</td>
                        <td className="max-w-[220px] py-2 text-[12px] text-amber">
                          {w.map((t) => (
                            <span key={t} className="mb-1 flex gap-1">
                              <Icon n="alert" s={13} className="mt-0.5" />
                              {t}
                            </span>
                          ))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <aside className="col-span-12 xl:col-span-3">
            <div className="box sticky top-20 p-5">
              <Label>Ringkasan</Label>
              {perChannel.map(({ c, n }) => (
                <div key={c.id} className="flex justify-between gap-2 border-b border-line py-1.5 text-[13px]">
                  <span>{c.name}</span>
                  <span className="mono">
                    +{n} · stok {c.perDay ? Math.floor((c.queue + n) / c.perDay) : 0} hari
                  </span>
                </div>
              ))}
              <p className="mono my-4 text-[18px] font-semibold">
                {rows.length} video ke {perChannel.length} channel
              </p>
              <button
                type="button"
                className="btn btn-tomato w-full justify-center"
                disabled={uploading}
                onClick={() => {
                  demoOnly(`${rows.length} video masuk antrean ${perChannel.length} channel`, 'Unggah massal')
                  setRows([])
                  navigate('/')
                }}
              >
                Masukkan ke antrean
              </button>
              {uploading && <p className="mt-2 text-[12px] text-muted">Tunggu semua unggahan selesai.</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
