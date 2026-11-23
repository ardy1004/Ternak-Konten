import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PlatGlyph, Poster, StageGlyph } from '../components/domain'
import { LiveNotice } from '../components/LiveNotice'
import { Icon } from '../components/Icon'
import { Seg } from '../components/ui'
import { clock, monogram } from '../lib/format'
import { dayCapacity, liveChannels, NOW, PLATFORM_CODE, PLATFORMS, providerAt, WEEK_DAYS, weekPosts, type CalendarPost } from '../lib/store'

/** 8 warna lembut ramah-kertas, satu per channel. Teks di atasnya selalu tinta gelap. */
const TINTS = ['#EBD9C6', '#D5E0D3', '#EFE3B8', '#D3DCE8', '#E6D2D0', '#DCE5C8', '#EBCFD2', '#D9D3E4']
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5)
const ROW_H = 34

export default function Kalender() {
  const navigate = useNavigate()
  const [view, setView] = useState<'Minggu' | 'Hari' | 'Daftar'>('Minggu')
  const [channelId, setChannelId] = useState('')
  const [platform, setPlatform] = useState(-1)
  const [open, setOpen] = useState<CalendarPost | null>(null)
  const live = liveChannels()
  const tint = (id: string) => TINTS[live.findIndex((c) => c.id === id) % TINTS.length]
  const posts = weekPosts().filter((p) => (!channelId || p.channel.id === channelId) && (platform < 0 || p.platforms.includes(platform)))
  const nowTop = (NOW.h + NOW.m / 60 - HOURS[0]) * ROW_H

  return (
    <div className="p-5 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="disp text-[40px] md:text-[56px]">Kalender</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Seg options={['Minggu', 'Hari', 'Daftar'] as const} value={view} onChange={setView} label="Tampilan" />
          <span className="mono flex items-center gap-2">
            <button type="button" aria-label="Minggu sebelumnya">
              <Icon n="chevl" />
            </button>
            23–29 Nov 2026
            <button type="button" aria-label="Minggu berikutnya">
              <Icon n="chev" />
            </button>
          </span>
          <button type="button" className="btn btn-outline">
            Hari ini
          </button>
          <select className="!w-40" value={channelId} onChange={(e) => setChannelId(e.target.value)} aria-label="Filter channel">
            <option value="">Semua channel</option>
            {live.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="!w-40" value={platform} onChange={(e) => setPlatform(+e.target.value)} aria-label="Filter platform">
            <option value={-1}>Semua platform</option>
            {PLATFORMS.map((p, i) => (
              <option key={p} value={i}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LiveNotice>Jadwal posting muncul setelah unggah video (tahap 2b) dan penjadwal (tahap 2c) tersambung.</LiveNotice>
      {open && (
        <div className="box fixed right-6 top-24 z-40 w-72 p-3" role="dialog" aria-label={`Post ${open.channel.name}`}>
          <button type="button" className="absolute right-2 top-2" onClick={() => setOpen(null)} aria-label="Tutup">
            <Icon n="x" s={14} />
          </button>
          <Poster hue={open.channel.hue} ratio="16:9" title={open.channel.name} />
          <p className="mt-2 line-clamp-2 text-[13px]">Konten {open.channel.niche} — dari urutan teratas antrean.</p>
          <p className="mono my-2 text-[11px]">
            {WEEK_DAYS[open.day]} · {clock(open.h, open.m)} · Terjadwal
          </p>
          <div className="mb-2 flex gap-1">
            {open.platforms.map((i) => (
              <PlatGlyph key={i} i={i} />
            ))}
          </div>
          {open.conflict && <p className="mb-2 text-[12px] text-red">{open.conflict}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/channel/${open.channel.id}`)}>
              Buka channel
            </button>
            <button type="button" className="btn btn-outline">
              Geser jadwal
            </button>
          </div>
        </div>
      )}

      {view === 'Minggu' && (
        <div className="scroll-x">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b-[1.5px] border-ink">
              {['', ...WEEK_DAYS].map((d, i) => (
                <div
                  key={i}
                  className={`mono px-1 py-2 text-[11px] uppercase ${i - 1 === NOW.day ? 'font-semibold text-ink' : 'text-muted'}`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line" style={{ minHeight: ROW_H }}>
                  <div className="mono pt-1 text-[11px] text-muted">{clock(h, 0)}</div>
                  {WEEK_DAYS.map((_, d) => {
                    const here = posts.filter((p) => p.day === d && p.h === h)
                    return (
                      <div key={d} className="flex flex-col gap-0.5 border-l border-line p-0.5">
                        {here.slice(0, 2).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setOpen(p)}
                            className={`flex items-center gap-1 rounded-[3px] px-1 text-left text-[10px] text-[#141210] ${p.conflict ? 'outline outline-2 outline-red' : ''}`}
                            style={{ background: tint(p.channel.id) }}
                          >
                            <b>{monogram(p.channel.name)}</b>
                            <span className="mono">{clock(p.h, p.m)}</span>
                            <StageGlyph stage={p.channel.stage} s={9} />
                            {p.conflict && <span className="font-semibold text-[#c62828]">Bentrok</span>}
                          </button>
                        ))}
                        {here.length > 2 && <span className="mono text-[10px] text-muted">+{here.length - 2}</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
              <div
                className="absolute h-[2px] bg-tomato"
                style={{ top: nowTop, left: `calc(56px + (100% - 56px) / 7 * ${NOW.day})`, width: 'calc((100% - 56px) / 7)' }}
              >
                <span className="mono absolute -top-2 left-1 bg-paper px-0.5 text-[9px] text-tomatotxt">{clock(NOW.h, NOW.m)}</span>
              </div>
            </div>
            <div className="mono grid grid-cols-[56px_repeat(7,1fr)] pt-2 text-[11px]">
              <span />
              {WEEK_DAYS.map((d, i) => {
                const cap = dayCapacity(i)
                return (
                  <span key={d} className={cap.filled < cap.total ? 'text-red' : 'text-muted'}>
                    {cap.filled}/{cap.total} slot
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'Hari' && (
        <div className="space-y-1">
          {live
            .filter((c) => !channelId || c.id === channelId)
            .map((c) => (
              <div key={c.id} className="grid grid-cols-[140px_1fr] items-center gap-2 border-b border-line py-2">
                <span className="text-[13px] font-medium">{c.name}</span>
                <div className="relative h-8 bg-line/40">
                  {posts
                    .filter((p) => p.channel.id === c.id && p.day === NOW.day)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setOpen(p)}
                        className="mono absolute top-1 rounded-[3px] px-1 text-[10px] text-[#141210]"
                        style={{ left: `${((p.h + p.m / 60 - HOURS[0]) / HOURS.length) * 100}%`, background: tint(c.id) }}
                      >
                        {clock(p.h, p.m)}
                      </button>
                    ))}
                  <span
                    className="absolute inset-y-0 w-[2px] bg-tomato"
                    style={{ left: `${((NOW.h + NOW.m / 60 - HOURS[0]) / HOURS.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {view === 'Daftar' && (
        <div className="scroll-x">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b-[1.5px] border-ink">
                {['Waktu', 'Channel', 'Platform', 'Status', 'Provider'].map((h) => (
                  <th key={h} className="th py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...posts]
                .sort((a, b) => a.day - b.day || a.h * 60 + a.m - (b.h * 60 + b.m))
                .slice(0, 30)
                .map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="mono py-2">
                      {WEEK_DAYS[p.day].split(' ')[0].slice(0, 3)} {clock(p.h, p.m)}
                    </td>
                    <td>{p.channel.name}</td>
                    <td className="mono">{p.platforms.map((i) => PLATFORM_CODE[i]).join(' ')}</td>
                    <td className={p.conflict ? 'text-red' : 'text-blue'}>{p.conflict ? 'Bentrok' : 'Terjadwal'}</td>
                    <td>{[...new Set(p.platforms.map((i) => providerAt(p.channel, i)))].join(' + ')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
