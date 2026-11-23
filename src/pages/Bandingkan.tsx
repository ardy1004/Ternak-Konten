import { useState } from 'react'
import { Poster } from '../components/domain'
import { Label, MultiChips, Seg } from '../components/ui'
import { num, times } from '../lib/format'
import {
  BY_DURATION,
  BY_FORMAT,
  CHANNELS,
  costPer1000Views,
  curve,
  curveAt,
  HOUR_HEAT,
  medianCurve,
  NOW,
  PLATFORMS,
  roi,
  topVideos,
} from '../lib/mock'
import type { Stage } from '../lib/types'

const STAGES: Stage[] = ['Bibit', 'Tumbuh', 'Panen', 'Dipangkas']
const CHECKPOINTS = [7, 14, 30, 60]
const SMALL_SAMPLE = 5

// Geometri grafik kohort (unit viewBox).
const W = 900
const H = 380
const LEFT = 48
const RIGHT = W - 130
const TOP = 16
const BOTTOM = H - 46
const MAX_DAY = 90

export default function Bandingkan() {
  const [hover, setHover] = useState<string | null>(null)
  const [metric, setMetric] = useState<'Views/post' | 'Followers' | 'Engagement'>('Views/post')
  const [stages, setStages] = useState<Stage[]>(STAGES)
  const shown = CHANNELS.filter((c) => stages.includes(c.stage))

  const curves = shown.map((c) => ({ c, pts: curve(c, Math.min(c.day, MAX_DAY)) }))
  const median = medianCurve(MAX_DAY)
  const target = 1000
  const yMax = Math.ceil(Math.max(target, ...curves.flatMap((x) => x.pts), ...median) / 500) * 500
  const X = (d: number) => LEFT + (d / MAX_DAY) * (RIGHT - LEFT)
  const Y = (v: number) => BOTTOM - (v / yMax) * (BOTTOM - TOP)

  // Label di ujung garis: sebar ke bawah bila berdekatan, supaya nama tidak saling menimpa.
  const labels = curves
    .map(({ c, pts }) => ({ id: c.id, name: c.name, x: X(pts.length - 1) + 6, y: Y(pts[pts.length - 1]) + 3 }))
    .sort((a, b) => a.y - b.y)
  labels.forEach((l, i) => {
    for (let k = 0; k < i; k++) {
      const p = labels[k]
      if (Math.abs(l.x - p.x) < 110 && l.y - p.y < 12) l.y = p.y + 12
    }
  })

  const best = (d: number) =>
    shown.filter((c) => c.vids >= SMALL_SAMPLE && curveAt(c, d) !== null).sort((a, b) => (curveAt(b, d) ?? 0) - (curveAt(a, d) ?? 0))[0]?.id

  return (
    <div className="p-5 md:p-8">
      <h1 className="disp max-w-4xl text-[36px] md:text-[56px]">Bandingkan pada umur akun yang sama.</h1>
      <p className="mono mb-6 mt-3 text-[12px] text-ink2">Data terakhir {NOW.label} · ditarik dari Buffer & Zernio tiap hari</p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Seg options={['Views/post', 'Followers', 'Engagement'] as const} value={metric} onChange={setMetric} label="Metrik" />
        <select className="!w-44" aria-label="Platform">
          <option>Semua platform</option>
          {PLATFORMS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <MultiChips options={STAGES} value={stages} onChange={setStages} />
      </div>

      <div className="box scroll-x mb-10 p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label="Kurva views per post tiap channel menurut hari sejak post pertama"
        >
          {Array.from({ length: yMax / 500 + 1 }, (_, i) => i * 500).map((v) => (
            <g key={v}>
              <line x1={LEFT} x2={RIGHT} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
              <text x={LEFT - 8} y={Y(v) + 4} className="mono" fontSize="10" fill="var(--muted)" textAnchor="end">
                {num(v)}
              </text>
            </g>
          ))}
          {[0, 30, 60, 90].map((d) => (
            <text key={d} x={X(d)} y={BOTTOM + 18} fontSize="10" className="mono" fill="var(--muted)" textAnchor="middle">
              H+{d}
            </text>
          ))}
          <text x={RIGHT} y={H - 4} fontSize="10" className="mono" fill="var(--muted)" textAnchor="end">
            Hari ke-N sejak post pertama →
          </text>
          <polygon
            points={[
              ...median.map((v, i) => `${X(i)},${Y(v * 1.2)}`),
              ...median.map((_, i) => `${X(MAX_DAY - 1 - i)},${Y(median[MAX_DAY - 1 - i] * 0.8)}`),
            ].join(' ')}
            fill="var(--sand)"
            opacity=".7"
          />
          <line x1={LEFT} x2={RIGHT} y1={Y(target)} y2={Y(target)} stroke="var(--ink)" strokeDasharray="5 4" />
          <text x={RIGHT + 4} y={Y(target) + 4} fontSize="10" className="mono" fill="var(--ink)">
            target
          </text>
          {curves.map(({ c, pts }) => {
            const on = hover === c.id
            const line = pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
            const label = labels.find((l) => l.id === c.id)!
            return (
              <g
                key={c.id}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                opacity={hover && !on ? 0.2 : 1}
                style={{ cursor: 'pointer' }}
              >
                <polyline points={line} fill="none" stroke="transparent" strokeWidth="12" />
                <polyline points={line} fill="none" stroke={on ? 'var(--tomato)' : 'var(--ink)'} strokeWidth={on ? 2.5 : 1.3} />
                <text x={label.x} y={label.y} fontSize="10" fill={on ? 'var(--tomatotxt)' : 'var(--ink)'}>
                  {c.name}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="mono mt-2 text-[11px] text-muted">
          Pita = median semua channel di hari yang sama · arahkan kursor ke garis untuk menyorot satu channel
        </p>
      </div>

      <Label>Titik periksa</Label>
      <div className="scroll-x mb-10">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th className="th py-2">Channel</th>
              {CHECKPOINTS.map((d) => (
                <th key={d} className="th">
                  H+{d}
                </th>
              ))}
              <th className="th">Biaya/1.000 views</th>
              <th className="th">ROI bulan ini</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const cost = costPer1000Views(c)
              return (
                <tr key={c.id} className="border-b border-line">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  {CHECKPOINTS.map((d) => {
                    const v = curveAt(c, d)
                    if (v === null)
                      return (
                        <td key={d} className="mono text-muted">
                          —
                        </td>
                      )
                    if (c.vids < SMALL_SAMPLE)
                      return (
                        <td key={d} className="mono text-[11px] text-muted">
                          sampel kecil
                        </td>
                      )
                    return (
                      <td key={d} className="mono">
                        {best(d) === c.id && (
                          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-tomato" title="Terbaik di kolom ini" />
                        )}
                        {num(v)}
                      </td>
                    )
                  })}
                  <td className="mono">{cost === null ? '—' : `Rp ${num(cost)}`}</td>
                  <td className={`mono ${(roi(c) ?? 0) >= 1 ? 'font-semibold text-tomatotxt' : ''}`}>
                    {roi(c) === null ? '—' : times(roi(c)!)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Label>Pola</Label>
      <div className="mb-10 grid gap-5 md:grid-cols-3">
        <div className="box p-4">
          <h4 className="mb-3 font-semibold">Jam posting terbaik</h4>
          <div className="grid grid-cols-12 gap-[2px]" role="img" aria-label="Peta panas jam posting per hari">
            {HOUR_HEAT.map((v, i) => (
              <span key={i} className="aspect-square" style={{ background: 'var(--ink)', opacity: v }} />
            ))}
          </div>
          <p className="mono mt-2 text-[11px] text-muted">n = 168 · 12 blok jam × 7 hari</p>
        </div>
        {[
          { title: 'Views menurut durasi', rows: BY_DURATION },
          { title: 'Views menurut format', rows: BY_FORMAT },
        ].map(({ title, rows }) => {
          const ranked = rows.filter((r) => r.n >= SMALL_SAMPLE)
          const top = Math.max(...ranked.map((r) => r.views))
          const scale = Math.max(...rows.map((r) => r.views)) * 1.05
          return (
            <div key={title} className="box p-4">
              <h4 className="mb-3 font-semibold">{title}</h4>
              {rows.map((r) => {
                const small = r.n < SMALL_SAMPLE
                return (
                  <div
                    key={r.label}
                    className={`mb-2 grid grid-cols-[90px_1fr_52px] items-center gap-2 text-[12px] ${small ? 'text-muted' : ''}`}
                  >
                    <span>{r.label}</span>
                    <div className="h-3 bg-line">
                      <div
                        className="h-full"
                        style={{
                          width: `${(r.views / scale) * 100}%`,
                          background: small ? 'var(--gray)' : r.views === top ? 'var(--tomato)' : 'var(--ink)',
                        }}
                      />
                    </div>
                    <span className="mono text-right">{small ? 'n kecil' : num(r.views)}</span>
                  </div>
                )
              })}
              <p className="mono mt-2 text-[11px] text-muted">
                n = {num(rows.reduce((s, r) => s + r.n, 0))} video · kelompok n &lt; {SMALL_SAMPLE} tidak diberi peringkat
              </p>
            </div>
          )
        })}
      </div>

      <Label>Video teratas</Label>
      <div className="scroll-x">
        <table className="w-full min-w-[700px] text-[13px]">
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th className="th py-2">Video</th>
              <th className="th">Channel</th>
              <th className="th">Platform</th>
              <th className="th">Views H+7</th>
              <th className="th">Likes</th>
              <th className="th" title="Views hari ke-7 dibagi median channel + platform yang sama">
                Indeks ⓘ
              </th>
            </tr>
          </thead>
          <tbody>
            {topVideos().map(({ video: v, channel, platform, views7, likes }) => (
              <tr key={v.id} className="border-b border-line">
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <Poster hue={v.hue} className="w-8" />
                    <span className="max-w-[260px] truncate">{v.caption}</span>
                  </div>
                </td>
                <td>{channel.name}</td>
                <td>{PLATFORMS[platform]}</td>
                <td className="mono">{num(views7)}</td>
                <td className="mono">{num(likes)}</td>
                <td className={`mono ${v.index >= 1.5 ? 'font-semibold text-tomatotxt' : ''}`}>{times(v.index)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
